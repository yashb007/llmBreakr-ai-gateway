import * as userService from "../services/user.service.js";

/**
 * List all users.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - Array<{ id, email, name, is_super_admin, status, created_at, last_login_at }>
 */
export const listUsers = async (req, res) => {
  res.json(await userService.listUsers());
};

/**
 * Get a single user.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, email, name, is_super_admin, status, created_at, last_login_at }
 */
export const getUser = async (req, res) => {
  res.json(await userService.getUser(req.params.id));
};

/**
 * Create a user.
 * @param {import("express").Request} req - req.body: { email, name, password, is_super_admin? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 201 - { id, email, name, is_super_admin, status, created_at }
 */
export const createUser = async (req, res) => {
  const user = await userService.createUser(req.body, req.user);
  res.status(201).json(user);
};

/**
 * Update a user's name/status/password.
 * @param {import("express").Request} req - req.params.id: number, req.body: { name?, status?, password? }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, email, name, is_super_admin, status, created_at, last_login_at }
 */
export const updateUser = async (req, res) => {
  res.json(await userService.updateUser(req.params.id, req.body, req.user));
};

/**
 * Delete a user.
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const deleteUser = async (req, res) => {
  await userService.deleteUser(req.params.id, req.user);
  res.status(204).send();
};

/**
 * Get a user's effective permissions: what their roles grant, their individual
 * overrides, and the resolved effective set (overrides applied on top of roles).
 * @param {import("express").Request} req - req.params.id: number
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { role_permissions: string[], overrides: {permission, effect}[], effective: string[] }
 */
export const getUserPermissions = async (req, res) => {
  res.json(await userService.getUserPermissions(req.params.id));
};

/**
 * Grant or deny a specific permission for a user, overriding their role-derived permissions.
 * @param {import("express").Request} req - req.params.id: number, req.params.permission: string, req.body: { effect: "grant" | "deny" }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { user_id, permission, effect }
 */
export const setUserPermission = async (req, res) => {
  res.json(
    await userService.setUserPermission(req.params.id, req.params.permission, req.body.effect, req.user)
  );
};

/**
 * Remove a user's permission override, reverting to whatever their roles grant.
 * @param {import("express").Request} req - req.params.id: number, req.params.permission: string
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const removeUserPermission = async (req, res) => {
  await userService.removeUserPermission(req.params.id, req.params.permission, req.user);
  res.status(204).send();
};
