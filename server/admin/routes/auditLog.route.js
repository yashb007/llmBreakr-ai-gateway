import { Router } from "express";
import { validate } from "express-validation";
import * as auditLogController from "../controllers/auditLog.controller.js";
import * as auditLogValidation from "../validations/auditLog.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/audit-logs
 * List audit log entries (paginated, filterable by actor, action, resource
 * and date range). Read-only by design — no create/update/delete routes.
 * requires: audit:read
 */
router.get("/", authorize(PERMISSIONS.AUDIT_READ), validate(auditLogValidation.listAuditLogs), auditLogController.listAuditLogs);

export default router;
