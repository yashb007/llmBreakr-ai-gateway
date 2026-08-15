import * as usageService from "../services/usage.service.js";

/**
 * Get aggregate usage analytics (requests, errors, cost, latency, provider mix) over a time range.
 * @param {import("express").Request} req - req.query: { range?: "24h"|"7d"|"30d", project_id? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { range, totals, deltas, series, provider_mix }
 */
export const getUsage = async (req, res) => {
  res.json(await usageService.getUsage(req.query));
};
