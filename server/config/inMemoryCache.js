// A minimal in-process substitute for the subset of the Redis API this
// project actually uses — get/set/del/mGet/incr/expire and a MULTI batch of
// incrByFloat/incrBy/expire — for zero-config local use when REDIS_HOST
// isn't set (see config/redis.js). Not shared across processes, instances,
// or restarts: single-instance use only, same caveat as the SQLite fallback.

const SWEEP_INTERVAL_MS = 60_000;

export default function createInMemoryCache() {
  const store = new Map(); // key -> { value: string, expiresAt: number|null }

  const read = (key) => {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return null;
    }
    return entry;
  };

  // INCR/INCRBY/INCRBYFLOAT preserve any TTL already on the key (only a
  // plain SET resets it) — same behavior real Redis has.
  const incrByAmount = (key, amount) => {
    const entry = read(key);
    const next = (entry ? Number(entry.value) || 0 : 0) + amount;
    store.set(key, { value: String(next), expiresAt: entry ? entry.expiresAt : null });
    return next;
  };

  const setExpire = (key, seconds) => {
    const entry = store.get(key);
    if (!entry) return false;
    entry.expiresAt = Date.now() + seconds * 1000;
    return true;
  };

  const client = {
    async connect() {},
    async quit() {},
    on() {
      return client;
    },

    async get(key) {
      const entry = read(key);
      return entry ? entry.value : null;
    },

    async set(key, value, opts = {}) {
      store.set(key, { value: String(value), expiresAt: opts.EX ? Date.now() + opts.EX * 1000 : null });
      return "OK";
    },

    async del(key) {
      return store.delete(key) ? 1 : 0;
    },

    async mGet(keys) {
      return keys.map((key) => {
        const entry = read(key);
        return entry ? entry.value : null;
      });
    },

    async incr(key) {
      return incrByAmount(key, 1);
    },

    async incrBy(key, amount) {
      return incrByAmount(key, amount);
    },

    async incrByFloat(key, amount) {
      return incrByAmount(key, amount);
    },

    async expire(key, seconds) {
      return setExpire(key, seconds) ? 1 : 0;
    },

    multi() {
      const ops = [];
      const chain = {
        incrByFloat(key, amount) {
          ops.push(() => incrByAmount(key, amount));
          return chain;
        },
        incrBy(key, amount) {
          ops.push(() => incrByAmount(key, amount));
          return chain;
        },
        expire(key, seconds) {
          ops.push(() => setExpire(key, seconds));
          return chain;
        },
        // Queued ops run in a plain synchronous loop — on Node's single
        // thread nothing else can interleave mid-batch, so this is
        // effectively atomic like a real Redis MULTI/EXEC.
        async exec() {
          return ops.map((op) => op());
        },
      };
      return chain;
    },
  };

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt !== null && entry.expiresAt <= now) store.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
  sweep.unref();

  return client;
}
