import { Router } from "express";
import { validate } from "express-validation";
import * as virtualKeyController from "../controllers/virtualKey.controller.js";
import * as virtualKeyValidation from "../validations/virtualKey.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/virtual-keys
 * List all virtual keys.
 * requires: virtual_keys:read
 */
router.get("/", authorize(PERMISSIONS.VIRTUAL_KEYS_READ), virtualKeyController.listVirtualKeys);

/**
 * GET /api/admin/virtual-keys/:id
 * Get a single virtual key.
 * requires: virtual_keys:read
 * params: { id: number }
 */
router.get(
  "/:id",
  authorize(PERMISSIONS.VIRTUAL_KEYS_READ),
  validate(virtualKeyValidation.getVirtualKey),
  virtualKeyController.getVirtualKey
);

/**
 * POST /api/admin/virtual-keys
 * Issue a virtual key. The raw secret is returned once in the response body and never shown again.
 * requires: virtual_keys:create
 * body: { project_id: number, name: string, allowed_models?: string[], rpm_limit?: number, daily_budget_usd?: number, expires_at?: string }
 */
router.post(
  "/",
  authorize(PERMISSIONS.VIRTUAL_KEYS_CREATE),
  validate(virtualKeyValidation.createVirtualKey),
  virtualKeyController.createVirtualKey
);

/**
 * PATCH /api/admin/virtual-keys/:id
 * Update a virtual key's name/limits/allowed models/expiry.
 * requires: virtual_keys:create
 * params: { id: number }
 * body: { name?: string, allowed_models?: string[] | null, rpm_limit?: number | null, daily_budget_usd?: number | null, expires_at?: string | null }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.VIRTUAL_KEYS_CREATE),
  validate(virtualKeyValidation.updateVirtualKey),
  virtualKeyController.updateVirtualKey
);

/**
 * POST /api/admin/virtual-keys/:id/approve
 * Approve a pending virtual key so it can authenticate data-plane requests.
 * requires: virtual_keys:manage
 * params: { id: number }
 */
router.post(
  "/:id/approve",
  authorize(PERMISSIONS.VIRTUAL_KEYS_MANAGE),
  validate(virtualKeyValidation.getVirtualKey),
  virtualKeyController.approveVirtualKey
);

/**
 * POST /api/admin/virtual-keys/:id/revoke
 * Revoke a virtual key (soft kill-switch; the row is kept for audit/usage history).
 * requires: virtual_keys:revoke
 * params: { id: number }
 */
router.post(
  "/:id/revoke",
  authorize(PERMISSIONS.VIRTUAL_KEYS_REVOKE),
  validate(virtualKeyValidation.getVirtualKey),
  virtualKeyController.revokeVirtualKey
);

/**
 * DELETE /api/admin/virtual-keys/:id
 * Delete a virtual key.
 * requires: virtual_keys:revoke
 * params: { id: number }
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.VIRTUAL_KEYS_REVOKE),
  validate(virtualKeyValidation.getVirtualKey),
  virtualKeyController.deleteVirtualKey
);

export default router;
