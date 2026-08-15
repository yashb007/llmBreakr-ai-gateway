import { Router } from "express";
import { validate } from "express-validation";
import * as userController from "../controllers/user.controller.js";
import * as userValidation from "../validations/user.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate, authorize(PERMISSIONS.USERS_MANAGE));

/**
 * GET /api/admin/users
 * List all users.
 */
router.get("/", userController.listUsers);

/**
 * POST /api/admin/users
 * Create a user.
 * body: { email: string, name: string, password: string, is_super_admin?: boolean }
 */
router.post("/", validate(userValidation.createUser), userController.createUser);

/**
 * GET /api/admin/users/:id
 * Get a single user.
 * params: { id: number }
 */
router.get("/:id", validate(userValidation.getUser), userController.getUser);

/**
 * PATCH /api/admin/users/:id
 * Update a user's name/status/password. Setting status to "disabled" also
 * revokes all of the user's active sessions.
 * params: { id: number }
 * body: { name?: string, status?: "active" | "disabled", password?: string }
 */
router.patch("/:id", validate(userValidation.updateUser), userController.updateUser);

/**
 * DELETE /api/admin/users/:id
 * Delete a user. Rejected with 400 if deleting your own account.
 * params: { id: number }
 */
router.delete("/:id", validate(userValidation.getUser), userController.deleteUser);

/**
 * GET /api/admin/users/:id/permissions
 * Get a user's role-derived permissions, individual overrides, and resolved effective set.
 * params: { id: number }
 */
router.get(
  "/:id/permissions",
  validate(userValidation.getUser),
  userController.getUserPermissions
);

/**
 * PUT /api/admin/users/:id/permissions/:permission
 * Grant or deny a specific permission for this user, overriding their roles.
 * params: { id: number, permission: string }
 * body: { effect: "grant" | "deny" }
 */
router.put(
  "/:id/permissions/:permission",
  validate(userValidation.setUserPermission),
  userController.setUserPermission
);

/**
 * DELETE /api/admin/users/:id/permissions/:permission
 * Remove a permission override, reverting to whatever the user's roles grant.
 * params: { id: number, permission: string }
 */
router.delete(
  "/:id/permissions/:permission",
  validate(userValidation.getUserPermission),
  userController.removeUserPermission
);

export default router;
