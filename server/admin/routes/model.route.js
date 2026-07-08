import { Router } from "express";
import { validate } from "express-validation";
import * as modelController from "../controllers/model.controller.js";
import * as modelValidation from "../validations/model.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/models
 * List all models registered on the gateway (the DB-stored equivalent of config.yaml's model_list).
 * requires: models:read
 */
router.get("/", authorize(PERMISSIONS.MODELS_READ), modelController.listModels);

/**
 * GET /api/admin/models/:id
 * Get a single model.
 * requires: models:read
 * params: { id: number }
 */
router.get(
  "/:id",
  authorize(PERMISSIONS.MODELS_READ),
  validate(modelValidation.getModel),
  modelController.getModel
);

/**
 * POST /api/admin/models
 * Register a model.
 * requires: models:manage
 * body: { model_name: string, litellm_params: { provider: string, model: string, api_base?: string, api_key?: string, ... } }
 */
router.post(
  "/",
  authorize(PERMISSIONS.MODELS_MANAGE),
  validate(modelValidation.createModel),
  modelController.createModel
);

/**
 * PATCH /api/admin/models/:id
 * Update a model's name/params, or set blocked: true/false to disable it without deleting it.
 * requires: models:manage
 * params: { id: number }
 * body: { model_name?: string, litellm_params?: object, blocked?: boolean }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.MODELS_MANAGE),
  validate(modelValidation.updateModel),
  modelController.updateModel
);

/**
 * DELETE /api/admin/models/:id
 * Delete a model.
 * requires: models:manage
 * params: { id: number }
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.MODELS_MANAGE),
  validate(modelValidation.getModel),
  modelController.deleteModel
);

export default router;
