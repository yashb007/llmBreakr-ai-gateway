import * as logService from "../services/log.service.js";

/**
 * List data-plane request logs (paginated, filterable).
 * @param {import("express").Request} req - req.query: { page?, limit?, status?, project_id?, virtual_key_id?, model?, provider?, blocked_by?, from?, to? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { data: Array<log>, pagination: { page, limit, total, total_pages } }
 */
export const listLogs = async (req, res) => {
  res.json(await logService.listLogs(req.query));
};
