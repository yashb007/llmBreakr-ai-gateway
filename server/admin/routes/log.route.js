import { Router } from "express";
import { validate } from "express-validation";
import * as logController from "../controllers/log.controller.js";
import * as logValidation from "../validations/log.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/logs
 * List data-plane request logs (paginated, filterable by status bucket, project,
 * virtual key, model, blocked_by reason and date range).
 * requires: logs:read
 */
router.get("/", authorize(PERMISSIONS.LOGS_READ), validate(logValidation.listLogs), logController.listLogs);

export default router;
