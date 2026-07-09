import * as virtualKeyService from "../services/virtualKey.service.js";

/**
 * List all virtual keys (metadata only, never the raw secret or its hash).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, project_id, name, key_prefix, allowed_models, rpm_limit, daily_budget_usd, expires_at, revoked, created_by, created_at }>
 */
export const listVirtualKeys = async (req, res) => {
  res.json(await virtualKeyService.listVirtualKeys());
};

/**
 * Get a single virtual key (metadata only).
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, project_id, name, key_prefix, allowed_models, rpm_limit, daily_budget_usd, expires_at, revoked, created_by, created_at }
 */
export const getVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.getVirtualKey(req.params.id));
};

/**
 * Issue a virtual key. The raw secret is generated here and returned exactly once — only its hash is stored.
 * @param {import("express").Request} req - req.body: { project_id, name, allowed_models?, rpm_limit?, daily_budget_usd?, expires_at? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, project_id, name, key_prefix, ..., key: string } (key is the raw secret, shown once)
 */
export const createVirtualKey = async (req, res) => {
  const key = await virtualKeyService.createVirtualKey(req.body, req.user);
  res.status(201).json(key);
};

/**
 * Update a virtual key's name/limits/allowed models/expiry.
 * @param {import("express").Request} req - req.params.id: number, req.body: { name?, allowed_models?, rpm_limit?, daily_budget_usd?, expires_at? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, project_id, name, key_prefix, allowed_models, rpm_limit, daily_budget_usd, expires_at, revoked, created_by, created_at }
 */
export const updateVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.updateVirtualKey(req.params.id, req.body, req.user));
};

/**
 * Revoke a virtual key (soft kill-switch; the row is kept for audit/usage history).
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, ..., revoked: true }
 */
export const revokeVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.revokeVirtualKey(req.params.id, req.user));
};

/**
 * Delete a virtual key.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteVirtualKey = async (req, res) => {
  await virtualKeyService.deleteVirtualKey(req.params.id, req.user);
  res.status(204).send();
};
