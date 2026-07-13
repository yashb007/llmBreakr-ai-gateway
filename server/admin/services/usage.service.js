import { Op, fn, col, literal } from "sequelize";
import RequestLog from "../../models/requestLog.model.js";
import { estimateCostUsd } from "../../utils/pricing.js";

const RANGE_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Hourly buckets for the 24h view, daily buckets otherwise.
const bucketFn = (range) =>
  range === "24h" ? fn("DATE_FORMAT", col("ts"), "%Y-%m-%d %H:00:00") : fn("DATE", col("ts"));

const buildWhere = (from, to, projectId) => ({
  ts: { [Op.gte]: from, [Op.lt]: to },
  ...(projectId && { project_id: projectId }),
});

// Cost isn't a SQL-expressible aggregate (estimateCostUsd is a JS lookup
// table keyed by model name), so pull small per-model token sums and reduce
// them in JS rather than duplicating the pricing table in SQL.
const getTotals = async (from, to, projectId) => {
  const [row] = await RequestLog.findAll({
    where: buildWhere(from, to, projectId),
    attributes: [
      [fn("COUNT", col("id")), "requests"],
      [fn("SUM", literal("CASE WHEN status >= 400 THEN 1 ELSE 0 END")), "errors"],
      [fn("AVG", col("latency_ms")), "avg_latency_ms"],
    ],
    raw: true,
  });

  const modelTotals = await RequestLog.findAll({
    where: buildWhere(from, to, projectId),
    attributes: [
      "model",
      [fn("SUM", col("prompt_tokens")), "prompt_tokens"],
      [fn("SUM", col("completion_tokens")), "completion_tokens"],
    ],
    group: ["model"],
    raw: true,
  });

  const costUsd = modelTotals.reduce(
    (sum, m) =>
      sum + (m.model ? estimateCostUsd(m.model, Number(m.prompt_tokens) || 0, Number(m.completion_tokens) || 0) : 0),
    0
  );

  const requests = Number(row?.requests) || 0;
  const errors = Number(row?.errors) || 0;

  return {
    requests,
    errors,
    error_rate: requests ? errors / requests : 0,
    avg_latency_ms: row?.avg_latency_ms ? Math.round(Number(row.avg_latency_ms)) : 0,
    cost_usd: Math.round(costUsd * 10000) / 10000,
  };
};

const pctDelta = (current, prior) => (prior ? (current - prior) / prior : current ? 1 : 0);

export const getUsage = async ({ range, project_id }) => {
  const rangeKey = RANGE_MS[range] ? range : "7d";
  const windowMs = RANGE_MS[rangeKey];
  const now = new Date();
  const since = new Date(now.getTime() - windowMs);
  const priorSince = new Date(since.getTime() - windowMs);

  const [totals, priorTotals] = await Promise.all([
    getTotals(since, now, project_id),
    getTotals(priorSince, since, project_id),
  ]);

  const bucket = bucketFn(rangeKey);
  const series = await RequestLog.findAll({
    where: buildWhere(since, now, project_id),
    attributes: [
      [bucket, "bucket"],
      [fn("SUM", literal("CASE WHEN status < 400 THEN 1 ELSE 0 END")), "success"],
      [fn("SUM", literal("CASE WHEN status >= 400 THEN 1 ELSE 0 END")), "error"],
    ],
    group: [bucket],
    order: [[bucket, "ASC"]],
    raw: true,
  });

  const providerRows = await RequestLog.findAll({
    where: buildWhere(since, now, project_id),
    attributes: ["provider", [fn("COUNT", col("id")), "requests"]],
    group: ["provider"],
    raw: true,
  });
  const providerTotal = providerRows.reduce((sum, p) => sum + Number(p.requests), 0);

  return {
    range: rangeKey,
    totals,
    deltas: {
      requests_pct: pctDelta(totals.requests, priorTotals.requests),
      cost_pct: pctDelta(totals.cost_usd, priorTotals.cost_usd),
      latency_pct: pctDelta(totals.avg_latency_ms, priorTotals.avg_latency_ms),
      error_rate_pct: pctDelta(totals.error_rate, priorTotals.error_rate),
    },
    series: series.map((s) => ({
      bucket: s.bucket,
      success: Number(s.success) || 0,
      error: Number(s.error) || 0,
    })),
    provider_mix: providerRows
      .filter((p) => p.provider)
      .map((p) => ({
        provider: p.provider,
        requests: Number(p.requests),
        pct: providerTotal ? Number(p.requests) / providerTotal : 0,
      })),
  };
};
