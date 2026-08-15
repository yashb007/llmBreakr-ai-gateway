import * as modelService from "../services/model.service.js";

/**
 * List the provider model catalog (populated automatically when a provider
 * credential is created/synced — not manually registered).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, provider, model_id, input_price_per_million, output_price_per_million, cache_write_price_per_million, cache_read_price_per_million, created_at }>
 */
export const listModels = async (req, res) => {
  res.json(await modelService.listModels());
};

/**
 * Get a single catalog model.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, provider, model_id, input_price_per_million, output_price_per_million, cache_write_price_per_million, cache_read_price_per_million, created_at }
 */
export const getModel = async (req, res) => {
  res.json(await modelService.getModel(req.params.id));
};

/**
 * Set a catalog model's per-million-token pricing.
 * @param {import("express").Request} req - req.params.id: number, req.body: { input_price_per_million?, output_price_per_million?, cache_write_price_per_million?, cache_read_price_per_million? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, provider, model_id, input_price_per_million, output_price_per_million, cache_write_price_per_million, cache_read_price_per_million, created_at }
 */
export const updateModel = async (req, res) => {
  res.json(await modelService.updateModel(req.params.id, req.body, req.user));
};

/**
 * Delete a catalog model. Fails if any project still has it in its allowlist.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteModel = async (req, res) => {
  await modelService.deleteModel(req.params.id, req.user);
  res.status(204).send();
};
