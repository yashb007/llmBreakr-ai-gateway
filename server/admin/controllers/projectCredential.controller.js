import * as projectCredentialService from "../services/projectCredential.service.js";

/**
 * List a project's provider credentials (at most one per provider).
 * @param {import("express").Request} req - req.query.project_id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, project_id, provider_credential_id, provider, credential_name, created_by, created_at }>
 */
export const listProjectCredentials = async (req, res) => {
  res.json(await projectCredentialService.listProjectCredentials(req.query.project_id, req.user));
};

/**
 * Attach a provider credential to a project. Fails with 409 if the project
 * already has a credential for that provider.
 * @param {import("express").Request} req - req.body: { project_id, provider_credential_id }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, project_id, provider_credential_id, provider, credential_name, created_by, created_at }
 */
export const addProjectCredential = async (req, res) => {
  const row = await projectCredentialService.addProjectCredential(req.body.project_id, req.body, req.user);
  res.status(201).json(row);
};

/**
 * Detach a provider credential from a project.
 * @param {import("express").Request} req - req.params.id: number, req.query.project_id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const removeProjectCredential = async (req, res) => {
  await projectCredentialService.removeProjectCredential(req.query.project_id, req.params.id, req.user);
  res.status(204).send();
};
