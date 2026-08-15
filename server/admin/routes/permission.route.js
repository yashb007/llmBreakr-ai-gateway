import { Router } from "express";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

/**
 * GET /api/admin/permissions
 * List the fixed set of permission constants available to assign to roles.
 * requires: roles:manage
 * @returns {void} 200 - string[]
 */
router.get("/", authenticate, authorize(PERMISSIONS.ROLES_MANAGE), (req, res) => {
  res.json(Object.values(PERMISSIONS));
});

export default router;
