import { createClient } from "redis";
import { redis } from "./vars.js";
import createInMemoryCache from "./inMemoryCache.js";

// No REDIS_HOST set -> zero-config mode: an in-process cache instead of
// requiring a real Redis server. Set REDIS_HOST to use Redis instead —
// needed for anything beyond a single instance, since rate limits, budgets,
// and the virtual-key cache all live only in this process's memory otherwise.
export const backend = redis.host ? "redis" : "in-memory";

const redisClient = redis.host
  ? createClient({
      url: redis.host,
      // Plain dual-stack DNS lookup fails on this network even though an IPv4
      // (A) record exists — forcing IPv4 resolution avoids the broken IPv6 path.
      socket: { family: 4 },
    })
  : createInMemoryCache();

if (redis.host) {
  redisClient.on("error", (err) => console.error("Redis client error", err));
}

export default redisClient;
