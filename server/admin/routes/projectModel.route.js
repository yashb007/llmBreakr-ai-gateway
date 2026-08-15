import { Router } from "express";
import { validate } from "express-validation";
import * as projectModelController from "../controllers/projectModel.controller.js";
import * as projectModelValidation from "../validations/projectModel.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/project-models?project_id=
 * List the models a project is allowed to call.
 * requires: project_models:read
 */
router.get(
  "/",
  authorize(PERMISSIONS.PROJECT_MODELS_READ),
  validate(projectModelValidation.listProjectModels),
  projectModelController.listProjectModels
);

/**
 * POST /api/admin/project-models
 * Allow a project to call a catalog model. 409 if already allowed.
 * requires: project_models:manage
 * body: { project_id: number, provider_model_id: number }
 */
router.post(
  "/",
  authorize(PERMISSIONS.PROJECT_MODELS_MANAGE),
  validate(projectModelValidation.addProjectModel),
  projectModelController.addProjectModel
);

/**
 * DELETE /api/admin/project-models/:id?project_id=
 * Remove a model from a project's allowlist.
 * requires: project_models:manage
 * params: { id: number }
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.PROJECT_MODELS_MANAGE),
  validate(projectModelValidation.removeProjectModel),
  projectModelController.removeProjectModel
);

export default router;
