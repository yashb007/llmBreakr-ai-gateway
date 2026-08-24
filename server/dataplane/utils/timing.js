// Per-stage latency breakdown for a dataplane request. Each mark() records
// the elapsed time since the previous mark (or since startTiming), not since
// request start — so each entry is that stage's own cost, not cumulative.
export const startTiming = (req, _res, next) => {
  req._timingStart = process.hrtime.bigint();
  req._lastMark = req._timingStart;
  req.timings = [];
  next();
};

export const mark = (req, stage) => {
  if (!req?._lastMark) return;
  const now = process.hrtime.bigint();
  req.timings.push({ stage, ms: Number(now - req._lastMark) / 1e6 });
  req._lastMark = now;
};

export const totalMs = (req) => (req?._timingStart ? Number(process.hrtime.bigint() - req._timingStart) / 1e6 : null);

export const logTimings = (req) => {
  if (!req?.timings?.length) return;
  console.log(
    "[timing]",
    JSON.stringify({
      totalMs: Math.round(totalMs(req) * 100) / 100,
      stages: req.timings.map((t) => ({ stage: t.stage, ms: Math.round(t.ms * 100) / 100 })),
    })
  );
};
