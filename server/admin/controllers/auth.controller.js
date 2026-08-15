import * as authService from "../services/auth.service.js";

/**
 * Authenticate with email/password and start a session.
 * @param {import("express").Request} req - req.body: { email, password }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { access_token, refresh_token, user: { id, email, name, is_super_admin } }
 */
export const login = async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json(result);
};

/**
 * Exchange a still-valid refresh token for a new short-lived access token.
 * @param {import("express").Request} req - req.body: { refresh_token }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { access_token }
 */
export const refresh = async (req, res) => {
  res.json(await authService.refresh(req.body.refresh_token));
};

/**
 * Revoke a refresh token (and with it, its ability to mint new access
 * tokens). Doesn't require a valid access token.
 * @param {import("express").Request} req - req.body: { refresh_token }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const logout = async (req, res) => {
  await authService.logout(req.body.refresh_token);
  res.status(204).send();
};

/**
 * Get the currently authenticated user, including their roles and effective permissions.
 * @param {import("express").Request} req - req.user set by authenticate middleware
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, email, name, is_super_admin, status, last_login_at, roles: {id, name}[], permissions: string[] }
 */
export const me = async (req, res) => {
  res.json(await authService.me(req.user));
};

/**
 * Change the current user's own password. Requires the current password;
 * on success, every other active session for this user is revoked.
 * @param {import("express").Request} req - req.user, req.session set by authenticate middleware; req.body: { current_password, new_password }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const changePassword = async (req, res) => {
  await authService.changePassword(req.user, req.body, req.session.id);
  res.status(204).send();
};
