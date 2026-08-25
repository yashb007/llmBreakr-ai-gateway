import { Router } from "express";
import { validate } from "express-validation";
import * as projectModelFallbackController from "../controllers/projectModelFallback.controller.js";
import * as projectModelFallbackValidation from "../validations/projectModelFallback.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/project-model-fallbacks?project_id=
 * List a project's configured fallback chains.
 * requires: project_models:read
 */
router.get(
  "/",
  authorize(PERMISSIONS.PROJECT_MODELS_READ),
  validate(projectModelFallbackValidation.listFallbacks),
  projectModelFallbackController.listFallbacks
);

/**
 * POST /api/admin/project-model-fallbacks
 * Add a fallback to a chain. 409 if this exact pair already exists.
 * requires: project_models:manage
 * body: { project_id, primary_project_model_id, fallback_project_model_id, priority? }
 */
router.post(
  "/",
  authorize(PERMISSIONS.PROJECT_MODELS_MANAGE),
  validate(projectModelFallbackValidation.addFallback),
  projectModelFallbackController.addFallback
);

/**
 * PATCH /api/admin/project-model-fallbacks/:id?project_id=
 * Reorder a fallback within its chain.
 * requires: project_models:manage
 * body: { priority }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.PROJECT_MODELS_MANAGE),
  validate(projectModelFallbackValidation.updateFallbackPriority),
  projectModelFallbackController.updateFallbackPriority
);

/**
 * DELETE /api/admin/project-model-fallbacks/:id?project_id=
 * Remove one link from a fallback chain.
 * requires: project_models:manage
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.PROJECT_MODELS_MANAGE),
  validate(projectModelFallbackValidation.removeFallback),
  projectModelFallbackController.removeFallback
);

export default router;
