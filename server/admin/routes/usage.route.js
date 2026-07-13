import { Router } from "express";
import { validate } from "express-validation";
import * as usageController from "../controllers/usage.controller.js";
import * as usageValidation from "../validations/usage.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/usage
 * Aggregate usage analytics (requests, errors, cost, latency, provider mix) for
 * the Overview dashboard, optionally scoped to a single project.
 * requires: usage:read
 */
router.get("/", authorize(PERMISSIONS.USAGE_READ), validate(usageValidation.getUsage), usageController.getUsage);

export default router;
