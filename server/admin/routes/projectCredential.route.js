import { Router } from "express";
import { validate } from "express-validation";
import * as projectCredentialController from "../controllers/projectCredential.controller.js";
import * as projectCredentialValidation from "../validations/projectCredential.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/project-credentials?project_id=
 * List a project's provider credentials (at most one per provider).
 * requires: project_credentials:read
 */
router.get(
  "/",
  authorize(PERMISSIONS.PROJECT_CREDENTIALS_READ),
  validate(projectCredentialValidation.listProjectCredentials),
  projectCredentialController.listProjectCredentials
);

/**
 * POST /api/admin/project-credentials
 * Attach a provider credential to a project. 409 if the project already has
 * a credential for that provider.
 * requires: project_credentials:manage
 * body: { project_id: number, provider_credential_id: number }
 */
router.post(
  "/",
  authorize(PERMISSIONS.PROJECT_CREDENTIALS_MANAGE),
  validate(projectCredentialValidation.addProjectCredential),
  projectCredentialController.addProjectCredential
);

/**
 * DELETE /api/admin/project-credentials/:id?project_id=
 * Detach a provider credential from a project.
 * requires: project_credentials:manage
 * params: { id: number }
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.PROJECT_CREDENTIALS_MANAGE),
  validate(projectCredentialValidation.removeProjectCredential),
  projectCredentialController.removeProjectCredential
);

export default router;
