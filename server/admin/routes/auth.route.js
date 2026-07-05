import { Router } from "express";
import { validate } from "express-validation";
import * as authController from "../controllers/auth.controller.js";
import * as authValidation from "../validations/auth.validation.js";
import { authenticate } from "../../middlewares/auth.js";

const router = Router();

/**
 * POST /api/admin/auth/login
 * Authenticate with email/password and start a session.
 * body: { email: string, password: string }
 */
router.post("/login", validate(authValidation.login), authController.login);

/**
 * POST /api/admin/auth/logout
 * Revoke the current session.
 * header: Authorization: Bearer <token>
 */
router.post("/logout", authenticate, authController.logout);

/**
 * GET /api/admin/auth/me
 * Get the currently authenticated user.
 * header: Authorization: Bearer <token>
 */
router.get("/me", authenticate, authController.me);

export default router;
