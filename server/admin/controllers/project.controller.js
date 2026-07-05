import * as projectService from "../services/project.service.js";

/**
 * List all projects.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, name, created_by, created_at }>
 */
export const listProjects = async (req, res) => {
  res.json(await projectService.listProjects());
};

/**
 * Get a single project.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, name, created_by, created_at }
 */
export const getProject = async (req, res) => {
  res.json(await projectService.getProject(req.params.id));
};

/**
 * Create a project.
 * @param {import("express").Request} req - req.body: { name }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, name, created_by, created_at }
 */
export const createProject = async (req, res) => {
  const project = await projectService.createProject(req.body, req.user);
  res.status(201).json(project);
};

/**
 * Update a project's name.
 * @param {import("express").Request} req - req.params.id: number, req.body: { name }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, name, created_by, created_at }
 */
export const updateProject = async (req, res) => {
  res.json(await projectService.updateProject(req.params.id, req.body, req.user));
};

/**
 * Delete a project.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteProject = async (req, res) => {
  await projectService.deleteProject(req.params.id, req.user);
  res.status(204).send();
};
