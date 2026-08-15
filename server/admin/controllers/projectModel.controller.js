import * as projectModelService from "../services/projectModel.service.js";

/**
 * List the models a project is allowed to call.
 * @param {import("express").Request} req - req.query.project_id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, project_id, provider_model_id, provider, model_id, created_by, created_at }>
 */
export const listProjectModels = async (req, res) => {
  res.json(await projectModelService.listProjectModels(req.query.project_id, req.user));
};

/**
 * Allow a project to call a catalog model. Fails with 409 if already allowed.
 * @param {import("express").Request} req - req.body: { project_id, provider_model_id }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, project_id, provider_model_id, provider, model_id, created_by, created_at }
 */
export const addProjectModel = async (req, res) => {
  const row = await projectModelService.addProjectModel(req.body.project_id, req.body, req.user);
  res.status(201).json(row);
};

/**
 * Remove a model from a project's allowlist.
 * @param {import("express").Request} req - req.params.id: number, req.query.project_id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const removeProjectModel = async (req, res) => {
  await projectModelService.removeProjectModel(req.query.project_id, req.params.id, req.user);
  res.status(204).send();
};
