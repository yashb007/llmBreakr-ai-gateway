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
 * List virtual keys. Super admins see all; everyone else only sees keys
 * created by themselves or by another user who shares a role with them, plus
 * any key belonging to a project they have access to (project access cascades
 * to every key inside it regardless of who issued that specific key).
 * requires: virtual_keys:read
 */
router.get("/", authorize(PERMISSIONS.VIRTUAL_KEYS_READ), virtualKeyController.listVirtualKeys);

/**
 * GET /api/admin/virtual-keys/:id
 * Get a single virtual key. 404s (not 403) if it's outside the caller's
 * role/project-scoped access — see GET / above.
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
 * Unlike GET/PATCH/DELETE, creation isn't role-scoped — any existing project_id is accepted, and
 * the new key is immediately visible to its creator regardless of who else can see the project.
 * requires: virtual_keys:create
 * body: { project_id: number, name: string, rpm_limit?: number, daily_budget_usd?: number, expires_at?: string }
 */
router.post(
  "/",
  authorize(PERMISSIONS.VIRTUAL_KEYS_CREATE),
  validate(virtualKeyValidation.createVirtualKey),
  virtualKeyController.createVirtualKey
);

/**
 * PATCH /api/admin/virtual-keys/:id
 * Update a virtual key's name/limits/expiry.
 * requires: virtual_keys:create
 * params: { id: number }
 * body: { name?: string, rpm_limit?: number | null, daily_budget_usd?: number | null, expires_at?: string | null }
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
 * POST /api/admin/virtual-keys/:id/test
 * Run a minimal, fixed test prompt through the key's own provider/model config.
 * Read-only for the key itself — makes one real provider call and logs it like
 * any other request, but never edits/revokes/deletes anything.
 * requires: virtual_keys:manage
 * params: { id: number }
 */
router.post(
  "/:id/test",
  authorize(PERMISSIONS.VIRTUAL_KEYS_MANAGE),
  validate(virtualKeyValidation.getVirtualKey),
  virtualKeyController.testVirtualKey
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
