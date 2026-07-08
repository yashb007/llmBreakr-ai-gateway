import { Router } from "express";
import { validate } from "express-validation";
import * as roleController from "../controllers/role.controller.js";
import * as roleValidation from "../validations/role.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate, authorize(PERMISSIONS.ROLES_MANAGE));

/**
 * GET /api/admin/roles
 * List all roles with their assigned permissions.
 */
router.get("/", roleController.listRoles);

/**
 * POST /api/admin/roles
 * Create a role.
 * body: { name: string, description?: string, permissions?: string[] }
 */
router.post("/", validate(roleValidation.createRole), roleController.createRole);

/**
 * GET /api/admin/roles/:id
 * Get a single role with its assigned permissions.
 * params: { id: number }
 */
router.get("/:id", validate(roleValidation.getRole), roleController.getRole);

/**
 * PATCH /api/admin/roles/:id
 * Update a role's name/description.
 * params: { id: number }
 * body: { name?: string, description?: string }
 */
router.patch("/:id", validate(roleValidation.updateRole), roleController.updateRole);

/**
 * DELETE /api/admin/roles/:id
 * Delete a role. Rejected with 400 if the role is a system role (is_system).
 * params: { id: number }
 */
router.delete("/:id", validate(roleValidation.getRole), roleController.deleteRole);

/**
 * PUT /api/admin/roles/:id/permissions
 * Replace a role's full permission set.
 * params: { id: number } role id
 * body: { permissions: string[] }
 */
router.put(
  "/:id/permissions",
  validate(roleValidation.setPermissions),
  roleController.setRolePermissions
);

/**
 * GET /api/admin/roles/:id/users
 * List users who hold this role.
 * params: { id: number } role id
 */
router.get("/:id/users", validate(roleValidation.getRole), roleController.listRoleUsers);

/**
 * POST /api/admin/roles/:id/users
 * Assign this role to a user. Rejected with 409 if already assigned.
 * params: { id: number } role id
 * body: { user_id: number } user id
 */
router.post("/:id/users", validate(roleValidation.assignRole), roleController.assignRole);

/**
 * DELETE /api/admin/roles/:id/users/:userId
 * Revoke this role from a user.
 * params: { id: number, userId: number } roleid, userid
 */
router.delete("/:id/users/:userId", validate(roleValidation.revokeRole), roleController.revokeRole);

export default router;
