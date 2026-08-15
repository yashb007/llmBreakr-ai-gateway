import { Router } from "express";
import { validate } from "express-validation";
import * as authController from "../controllers/auth.controller.js";
import * as authValidation from "../validations/auth.validation.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();

/**
 * POST /api/admin/auth/login
 * Authenticate with email/password. Returns a short-lived JWT access token
 * plus a long-lived, revocable refresh token.
 * body: { email: string, password: string }
 */
router.post("/login", validate(authValidation.login), authController.login);

/**
 * POST /api/admin/auth/refresh
 * Exchange a still-valid refresh token for a new access token.
 * body: { refresh_token: string }
 */
router.post("/refresh", validate(authValidation.refresh), authController.refresh);

/**
 * POST /api/admin/auth/logout
 * Revoke a refresh token. Doesn't require a valid access token — works even
 * if the access token has already expired.
 * body: { refresh_token: string }
 */
router.post("/logout", validate(authValidation.logout), authController.logout);

/**
 * GET /api/admin/auth/me
 * Get the currently authenticated user, including their roles and effective permissions.
 * header: Authorization: Bearer <access_token>
 */
router.get("/me", authenticate, authController.me);

/**
 * PATCH /api/admin/auth/change-password
 * Change the current user's own password. Requires the current password;
 * revokes every other active session (refresh token) for this user on success.
 * header: Authorization: Bearer <access_token>
 * body: { current_password: string, new_password: string }
 */
router.patch(
  "/change-password",
  authenticate,
  validate(authValidation.changePassword),
  authController.changePassword
);

export default router;
