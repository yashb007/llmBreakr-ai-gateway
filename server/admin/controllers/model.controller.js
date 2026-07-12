import * as modelService from "../services/model.service.js";

/**
 * List all models registered on the gateway.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, model_name, provider_params, blocked, created_by, created_at }>
 */
export const listModels = async (req, res) => {
  res.json(await modelService.listModels());
};

/**
 * Get a single model.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, model_name, provider_params, blocked, created_by, created_at }
 */
export const getModel = async (req, res) => {
  res.json(await modelService.getModel(req.params.id));
};

/**
 * Register a model.
 * @param {import("express").Request} req - req.body: { model_name, provider_params }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, model_name, provider_params, blocked, created_by, created_at }
 */
export const createModel = async (req, res) => {
  const model = await modelService.createModel(req.body, req.user);
  res.status(201).json(model);
};

/**
 * Update a model's name/params, or block/unblock it.
 * @param {import("express").Request} req - req.params.id: number, req.body: { model_name?, provider_params?, blocked? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, model_name, provider_params, blocked, created_by, created_at }
 */
export const updateModel = async (req, res) => {
  res.json(await modelService.updateModel(req.params.id, req.body, req.user));
};

/**
 * Delete a model.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteModel = async (req, res) => {
  await modelService.deleteModel(req.params.id, req.user);
  res.status(204).send();
};
