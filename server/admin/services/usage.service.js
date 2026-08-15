import { Op, fn, col, literal } from "sequelize";
import RequestLog from "../../models/requestLog.model.js";
import { estimateCostUsd, loadPricingByProviderModel, pricingKey } from "../../utils/pricing.js";

const RANGE_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

// Hourly buckets for the 24h view, daily buckets otherwise — unless a caller
// explicitly forces daily buckets (bucket: "day"), for a chart that always
// wants one bar per calendar day regardless of which window is selected.
// Both forms go through DATE_FORMAT (not the bare DATE() function) so the
// grouped column always comes back as a plain string — matters for
// fillSeries below, which needs to look values up by that same string key.
const isHourlyBucket = (range, forcedBucket) => forcedBucket !== "day" && range === "24h";
const bucketFn = (hourly) => fn("DATE_FORMAT", col("ts"), hourly ? "%Y-%m-%d %H:00:00" : "%Y-%m-%d");

const pad2 = (n) => String(n).padStart(2, "0");
const dayKeyOf = (d) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const hourKeyOf = (d) => `${dayKeyOf(d)} ${pad2(d.getUTCHours())}:00:00`;

// SQL only returns buckets that actually had a request, so a quiet day/hour
// is just absent rather than zero — that makes the x-axis skip around
// (charts jump straight from a bucket with traffic to the next one that
// has any, however far apart). This walks every bucket boundary from
// `since` to `now` and zero-fills whichever ones SQL didn't return, so the
// chart always shows the full window.
const fillSeries = (rows, since, now, hourly) => {
  const byKey = new Map(rows.map((r) => [r.bucket, r]));
  const stepMs = hourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const keyOf = hourly ? hourKeyOf : dayKeyOf;
  const start = hourly
    ? Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate(), since.getUTCHours())
    : Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), since.getUTCDate());

  const buckets = [];
  for (let t = start; t < now.getTime(); t += stepMs) {
    const key = keyOf(new Date(t));
    const row = byKey.get(key);
    buckets.push({
      bucket: key,
      success: Number(row?.success) || 0,
      error: Number(row?.error) || 0,
      input_tokens: Number(row?.input_tokens) || 0,
      output_tokens: Number(row?.output_tokens) || 0,
      cached_tokens: Number(row?.cached_tokens) || 0,
    });
  }
  return buckets;
};

const buildWhere = (from, to, projectId, virtualKeyId) => ({
  ts: { [Op.gte]: from, [Op.lt]: to },
  ...(projectId && { project_id: projectId }),
  ...(virtualKeyId && { virtual_key_id: virtualKeyId }),
});

// Cost isn't a SQL-expressible aggregate (pricing is per-model DB data, not
// a formula), so pull small per-model token sums and reduce them in JS
// against a model_name -> rates lookup instead.
const getTotals = async (from, to, projectId, virtualKeyId) => {
  const [[row], modelTotals, pricingByProviderModel] = await Promise.all([
    RequestLog.findAll({
      where: buildWhere(from, to, projectId, virtualKeyId),
      attributes: [
        [fn("COUNT", col("id")), "requests"],
        [fn("SUM", literal("CASE WHEN status >= 400 THEN 1 ELSE 0 END")), "errors"],
        [fn("AVG", col("latency_ms")), "avg_latency_ms"],
      ],
      raw: true,
    }),
    RequestLog.findAll({
      where: buildWhere(from, to, projectId, virtualKeyId),
      attributes: [
        "provider",
        "model",
        [fn("SUM", col("prompt_tokens")), "prompt_tokens"],
        [fn("SUM", col("completion_tokens")), "completion_tokens"],
        [fn("SUM", col("cache_write_tokens")), "cache_write_tokens"],
        [fn("SUM", col("cache_read_tokens")), "cache_read_tokens"],
      ],
      group: ["provider", "model"],
      raw: true,
    }),
    loadPricingByProviderModel(),
  ]);

  const costUsd = modelTotals.reduce(
    (sum, m) =>
      sum +
      (m.model
        ? estimateCostUsd(pricingByProviderModel.get(pricingKey(m.provider, m.model)), {
            prompt_tokens: Number(m.prompt_tokens) || 0,
            completion_tokens: Number(m.completion_tokens) || 0,
            cache_write_tokens: Number(m.cache_write_tokens) || 0,
            cache_read_tokens: Number(m.cache_read_tokens) || 0,
          })
        : 0),
    0
  );

  const inputTokens = modelTotals.reduce((sum, m) => sum + (Number(m.prompt_tokens) || 0), 0);
  const outputTokens = modelTotals.reduce((sum, m) => sum + (Number(m.completion_tokens) || 0), 0);
  const cachedTokens = modelTotals.reduce((sum, m) => sum + (Number(m.cache_read_tokens) || 0), 0);

  const requests = Number(row?.requests) || 0;
  const errors = Number(row?.errors) || 0;

  return {
    requests,
    errors,
    error_rate: requests ? errors / requests : 0,
    avg_latency_ms: row?.avg_latency_ms ? Math.round(Number(row.avg_latency_ms)) : 0,
    cost_usd: Math.round(costUsd * 10000) / 10000,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cached_tokens: cachedTokens,
  };
};

const pctDelta = (current, prior) => (prior ? (current - prior) / prior : current ? 1 : 0);

export const getUsage = async ({ range, project_id, virtual_key_id, bucket }) => {
  const rangeKey = RANGE_MS[range] ? range : "7d";
  const windowMs = RANGE_MS[rangeKey];
  const now = new Date();
  const since = new Date(now.getTime() - windowMs);
  const priorSince = new Date(since.getTime() - windowMs);

  const [totals, priorTotals] = await Promise.all([
    getTotals(since, now, project_id, virtual_key_id),
    getTotals(priorSince, since, project_id, virtual_key_id),
  ]);

  const hourly = isHourlyBucket(rangeKey, bucket);
  const bucketExpr = bucketFn(hourly);
  const rawSeries = await RequestLog.findAll({
    where: buildWhere(since, now, project_id, virtual_key_id),
    attributes: [
      [bucketExpr, "bucket"],
      [fn("SUM", literal("CASE WHEN status < 400 THEN 1 ELSE 0 END")), "success"],
      [fn("SUM", literal("CASE WHEN status >= 400 THEN 1 ELSE 0 END")), "error"],
      [fn("SUM", col("prompt_tokens")), "input_tokens"],
      [fn("SUM", col("completion_tokens")), "output_tokens"],
      [fn("SUM", col("cache_read_tokens")), "cached_tokens"],
    ],
    group: [bucketExpr],
    order: [[bucketExpr, "ASC"]],
    raw: true,
  });

  const providerRows = await RequestLog.findAll({
    where: buildWhere(since, now, project_id, virtual_key_id),
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
      input_tokens_pct: pctDelta(totals.input_tokens, priorTotals.input_tokens),
      output_tokens_pct: pctDelta(totals.output_tokens, priorTotals.output_tokens),
      cached_tokens_pct: pctDelta(totals.cached_tokens, priorTotals.cached_tokens),
    },
    series: fillSeries(rawSeries, since, now, hourly),
    provider_mix: providerRows
      .filter((p) => p.provider)
      .map((p) => ({
        provider: p.provider,
        requests: Number(p.requests),
        pct: providerTotal ? Number(p.requests) / providerTotal : 0,
      })),
  };
};
