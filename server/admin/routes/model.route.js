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
 * List the provider model catalog (auto-populated from provider credential sync).
 * requires: models:read
 */
router.get("/", authorize(PERMISSIONS.MODELS_READ), modelController.listModels);

/**
 * GET /api/admin/models/:id
 * Get a single catalog model.
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
 * PATCH /api/admin/models/:id
 * Set a catalog model's per-million-token pricing.
 * requires: models:manage
 * params: { id: number }
 * body: { input_price_per_million?: number, output_price_per_million?: number, cache_write_price_per_million?: number, cache_read_price_per_million?: number }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.MODELS_MANAGE),
  validate(modelValidation.updateModel),
  modelController.updateModel
);

/**
 * DELETE /api/admin/models/:id
 * Delete a catalog model. Fails with 409 if any project still has it allowed.
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
