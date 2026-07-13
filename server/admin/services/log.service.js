import { Op } from "sequelize";
import RequestLog from "../../models/requestLog.model.js";
import Project from "../../models/project.model.js";
import VirtualKey from "../../models/virtualKey.model.js";
import { estimateCostUsd } from "../../utils/pricing.js";

const STATUS_BUCKETS = {
  "2xx": [200, 299],
  "4xx": [400, 499],
  "5xx": [500, 599],
};

const statusBucketOf = (status) => (status ? `${Math.floor(status / 100)}xx` : null);

const publicLog = (row) => ({
  id: row.id,
  ts: row.ts,
  provider: row.provider,
  model: row.model,
  project_id: row.project_id,
  project_name: row.Project?.name ?? null,
  virtual_key_id: row.virtual_key_id,
  virtual_key_name: row.VirtualKey?.name ?? null,
  prompt_tokens: row.prompt_tokens,
  completion_tokens: row.completion_tokens,
  latency_ms: row.latency_ms,
  status: row.status,
  status_bucket: statusBucketOf(row.status),
  cached: row.cached,
  blocked_by: row.blocked_by,
  error: row.error,
  cost_usd: row.model ? estimateCostUsd(row.model, row.prompt_tokens, row.completion_tokens) : 0,
});

export const listLogs = async ({
  page,
  limit,
  status,
  project_id,
  virtual_key_id,
  model,
  blocked_by,
  from,
  to,
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Math.min(Number(limit) || 50, 200);

  const where = {};
  if (project_id) where.project_id = project_id;
  if (virtual_key_id) where.virtual_key_id = virtual_key_id;
  if (model) where.model = model;
  if (blocked_by) where.blocked_by = { [Op.in]: String(blocked_by).split(",") };
  if (status) {
    // "status" may be a comma-separated combo of buckets, e.g. "4xx,5xx" for an "errors" tab.
    const ranges = String(status)
      .split(",")
      .map((bucket) => STATUS_BUCKETS[bucket])
      .filter(Boolean);
    if (ranges.length) {
      where[Op.or] = ranges.map(([gte, lte]) => ({ status: { [Op.gte]: gte, [Op.lte]: lte } }));
    }
  }
  if (from || to) {
    where.ts = {
      ...(from && { [Op.gte]: new Date(from) }),
      ...(to && { [Op.lte]: new Date(to) }),
    };
  }

  const { rows, count } = await RequestLog.findAndCountAll({
    where,
    order: [["ts", "DESC"]],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
    include: [
      { model: Project, attributes: ["id", "name"] },
      { model: VirtualKey, attributes: ["id", "name", "key_prefix"] },
    ],
  });

  return {
    data: rows.map(publicLog),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      total_pages: Math.ceil(count / limitNum) || 1,
    },
  };
};
