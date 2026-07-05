import * as authService from "../services/auth.service.js";

/**
 * Authenticate with email/password and start a session.
 * @param {import("express").Request} req - req.body: { email, password }
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { token, user: { id, email, name, is_super_admin } }
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
 * Revoke the current session.
 * @param {import("express").Request} req - req.session, req.user set by authenticate middleware
 * @param {import("express").Response} res
 * @returns {Promise<void>} 204 - no content
 */
export const logout = async (req, res) => {
  await authService.logout(req.session, req.user);
  res.status(204).send();
};

/**
 * Get the currently authenticated user.
 * @param {import("express").Request} req - req.user set by authenticate middleware
 * @param {import("express").Response} res
 * @returns {Promise<void>} 200 - { id, email, name, is_super_admin, status, last_login_at }
 */
export const me = async (req, res) => {
  res.json(authService.me(req.user));
};
