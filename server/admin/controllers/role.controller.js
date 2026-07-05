import * as roleService from "../services/role.service.js";

/**
 * List all roles with their assigned permissions.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, name, description, is_system, created_at, permissions: string[] }>
 */
export const listRoles = async (req, res) => {
  res.json(await roleService.listRoles());
};

/**
 * Get a single role with its assigned permissions.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, name, description, is_system, created_at, permissions: string[] }
 */
export const getRole = async (req, res) => {
  res.json(await roleService.getRole(req.params.id));
};

/**
 * Create a role.
 * @param {import("express").Request} req - req.body: { name, description?, permissions? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, name, description, is_system, created_at, permissions: string[] }
 */
export const createRole = async (req, res) => {
  const role = await roleService.createRole(req.body, req.user);
  res.status(201).json(role);
};

/**
 * Update a role's name/description.
 * @param {import("express").Request} req - req.params.id: number, req.body: { name?, description? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, name, description, is_system, created_at, permissions: string[] }
 */
export const updateRole = async (req, res) => {
  res.json(await roleService.updateRole(req.params.id, req.body, req.user));
};

/**
 * Delete a role (rejected if it is a system role).
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteRole = async (req, res) => {
  await roleService.deleteRole(req.params.id, req.user);
  res.status(204).send();
};

/**
 * Replace a role's full permission set.
 * @param {import("express").Request} req - req.params.id: number, req.body: { permissions: string[] }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, name, description, is_system, created_at, permissions: string[] }
 */
export const setRolePermissions = async (req, res) => {
  res.json(await roleService.setRolePermissions(req.params.id, req.body.permissions, req.user));
};

/**
 * List users who hold a given role.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, email, name }>
 */
export const listRoleUsers = async (req, res) => {
  res.json(await roleService.listRoleUsers(req.params.id));
};

/**
 * Assign a role to a user.
 * @param {import("express").Request} req - req.params.id: number, req.body: { user_id: number }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { user_id, role_id }
 */
export const assignRole = async (req, res) => {
  const result = await roleService.assignRole(req.params.id, req.body.user_id, req.user);
  res.status(201).json(result);
};

/**
 * Revoke a role from a user.
 * @param {import("express").Request} req - req.params.id: number, req.params.userId: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const revokeRole = async (req, res) => {
  await roleService.revokeRole(req.params.id, req.params.userId, req.user);
  res.status(204).send();
};
