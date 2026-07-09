import * as providerCredentialService from "../services/providerCredential.service.js";

/**
 * List all provider credentials (metadata only, never the encrypted key).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, provider, name, description, created_by, created_at }>
 */
export const listProviderCredentials = async (req, res) => {
  res.json(await providerCredentialService.listProviderCredentials());
};

/**
 * Get a single provider credential (metadata only).
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, provider, name, description, created_by, created_at }
 */
export const getProviderCredential = async (req, res) => {
  res.json(await providerCredentialService.getProviderCredential(req.params.id));
};

/**
 * Create a provider credential. The raw api_key is encrypted before storage and never echoed back.
 * @param {import("express").Request} req - req.body: { provider, name, description, api_key }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, provider, name, description, created_by, created_at }
 */
export const createProviderCredential = async (req, res) => {
  const credential = await providerCredentialService.createProviderCredential(req.body, req.user);
  res.status(201).json(credential);
};

/**
 * Update a provider credential's metadata, or rotate its api_key.
 * @param {import("express").Request} req - req.params.id: number, req.body: { provider?, name?, description?, api_key? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, provider, name, description, created_by, created_at }
 */
export const updateProviderCredential = async (req, res) => {
  res.json(await providerCredentialService.updateProviderCredential(req.params.id, req.body, req.user));
};

/**
 * Delete a provider credential.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteProviderCredential = async (req, res) => {
  await providerCredentialService.deleteProviderCredential(req.params.id, req.user);
  res.status(204).send();
};
