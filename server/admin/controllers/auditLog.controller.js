import * as auditLogService from "../services/auditLog.service.js";

/**
 * List audit log entries (paginated, filterable). Read-only — there is no
 * create/update/delete endpoint for audit logs by design.
 * @param {import("express").Request} req - req.query: { page?, limit?, actor_id?, action?, resource_type?, resource_id?, status?, from?, to? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { data: Array<auditLog>, pagination: { page, limit, total, total_pages } }
 */
export const listAuditLogs = async (req, res) => {
  res.json(await auditLogService.listAuditLogs(req.query));
};
