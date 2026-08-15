import * as virtualKeyService from "../services/virtualKey.service.js";

/**
 * List all virtual keys (metadata only, never the raw secret or its hash).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, project_id, name, key_prefix, rpm_limit, daily_budget_usd, expires_at, revoked, created_by, created_at }>
 */
export const listVirtualKeys = async (req, res) => {
  res.json(await virtualKeyService.listVirtualKeys(req.user));
};

/**
 * Get a single virtual key (metadata only).
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, project_id, name, key_prefix, rpm_limit, daily_budget_usd, expires_at, revoked, created_by, created_at }
 */
export const getVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.getVirtualKey(req.params.id, req.user));
};

/**
 * Issue a virtual key. The raw secret is generated here and returned exactly once — only its hash is stored.
 * @param {import("express").Request} req - req.body: { project_id, name, rpm_limit?, daily_budget_usd?, expires_at? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, project_id, name, key_prefix, ..., key: string } (key is the raw secret, shown once)
 */
export const createVirtualKey = async (req, res) => {
  const key = await virtualKeyService.createVirtualKey(req.body, req.user);
  res.status(201).json(key);
};

/**
 * Update a virtual key's name/limits/expiry.
 * @param {import("express").Request} req - req.params.id: number, req.body: { name?, rpm_limit?, daily_budget_usd?, expires_at? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, project_id, name, key_prefix, rpm_limit, daily_budget_usd, expires_at, revoked, created_by, created_at }
 */
export const updateVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.updateVirtualKey(req.params.id, req.body, req.user));
};

/**
 * Approve a pending virtual key so it can authenticate data-plane requests.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, ..., approved: true, approved_by, approved_at }
 */
export const approveVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.approveVirtualKey(req.params.id, req.user));
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
 * Run a minimal, fixed test prompt through a virtual key's own provider/model
 * config to verify it works end-to-end. Read-only with respect to the key
 * itself (no edits), but does make one real (billed) provider call and logs
 * a real request/audit row, same as any other traffic through this key.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { ok: boolean, model?: string, latency_ms?: number, reply?: string, error?: string }
 */
export const testVirtualKey = async (req, res) => {
  res.json(await virtualKeyService.testVirtualKey(req.params.id, req.user));
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
