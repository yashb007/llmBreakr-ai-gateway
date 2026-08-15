import { Op } from "sequelize";
import AuditLog from "../../models/auditLog.model.js";

const publicAuditLog = (row) => ({
  id: row.id,
  ts: row.ts,
  actor_id: row.actor_id,
  actor_email: row.actor_email,
  actor_type: row.actor_type,
  action: row.action,
  resource_type: row.resource_type,
  resource_id: row.resource_id,
  metadata: row.metadata,
  ip: row.ip,
  user_agent: row.user_agent,
  status: row.status,
});

export const listAuditLogs = async ({
  page,
  limit,
  actor_id,
  action,
  resource_type,
  resource_id,
  status,
  from,
  to,
}) => {
  const pageNum = Number(page) || 1;
  const limitNum = Math.min(Number(limit) || 50, 200);

  const where = {};
  if (actor_id) where.actor_id = actor_id;
  if (action) where.action = action;
  if (resource_type) where.resource_type = resource_type;
  if (resource_id) where.resource_id = resource_id;
  if (status) where.status = status;
  if (from || to) {
    where.ts = {
      ...(from && { [Op.gte]: new Date(from) }),
      ...(to && { [Op.lte]: new Date(to) }),
    };
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [["ts", "DESC"]],
    limit: limitNum,
    offset: (pageNum - 1) * limitNum,
  });

  return {
    data: rows.map(publicAuditLog),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: count,
      total_pages: Math.ceil(count / limitNum) || 1,
    },
  };
};
