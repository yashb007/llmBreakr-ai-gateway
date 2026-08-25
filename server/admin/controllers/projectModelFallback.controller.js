import * as projectModelFallbackService from "../services/projectModelFallback.service.js";

/**
 * List a project's configured fallback chains.
 * @param {import("express").Request} req - req.query.project_id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, project_id, priority, primary_project_model_id, primary_model, fallback_project_model_id, fallback_model, created_by, created_at }>
 */
export const listFallbacks = async (req, res) => {
  res.json(await projectModelFallbackService.listFallbacks(req.query.project_id, req.user));
};

/**
 * Add a fallback to a chain. Fails with 409 if this exact pair already exists.
 * @param {import("express").Request} req - req.body: { project_id, primary_project_model_id, fallback_project_model_id, priority? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - the created row
 */
export const addFallback = async (req, res) => {
  const row = await projectModelFallbackService.addFallback(req.body.project_id, req.body, req.user);
  res.status(201).json(row);
};

/**
 * Reorder a fallback within its chain.
 * @param {import("express").Request} req - req.params.id: number, req.query.project_id: number, req.body.priority: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - the updated row
 */
export const updateFallbackPriority = async (req, res) => {
  const row = await projectModelFallbackService.updateFallbackPriority(
    req.query.project_id,
    req.params.id,
    req.body.priority,
    req.user
  );
  res.json(row);
};

/**
 * Remove one link from a fallback chain.
 * @param {import("express").Request} req - req.params.id: number, req.query.project_id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const removeFallback = async (req, res) => {
  await projectModelFallbackService.removeFallback(req.query.project_id, req.params.id, req.user);
  res.status(204).send();
};
