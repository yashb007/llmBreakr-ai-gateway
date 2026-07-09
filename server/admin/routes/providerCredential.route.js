import { Router } from "express";
import { validate } from "express-validation";
import * as providerCredentialController from "../controllers/providerCredential.controller.js";
import * as providerCredentialValidation from "../validations/providerCredential.validation.js";
import { authenticate } from "../../middlewares/auth.js";
import { authorize } from "../../middlewares/authorize.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = Router();

router.use(authenticate);

/**
 * GET /api/admin/provider-credentials
 * List all provider credentials (metadata only, never the encrypted key).
 * requires: provider_keys:read
 */
router.get(
  "/",
  authorize(PERMISSIONS.PROVIDER_KEYS_READ),
  providerCredentialController.listProviderCredentials
);

/**
 * GET /api/admin/provider-credentials/:id
 * Get a single provider credential (metadata only).
 * requires: provider_keys:read
 * params: { id: number }
 */
router.get(
  "/:id",
  authorize(PERMISSIONS.PROVIDER_KEYS_READ),
  validate(providerCredentialValidation.getProviderCredential),
  providerCredentialController.getProviderCredential
);

/**
 * POST /api/admin/provider-credentials
 * Create a provider credential. api_key is encrypted before storage.
 * requires: provider_keys:manage
 * body: { provider: string, name: string, description: string, api_key: string }
 */
router.post(
  "/",
  authorize(PERMISSIONS.PROVIDER_KEYS_MANAGE),
  validate(providerCredentialValidation.createProviderCredential),
  providerCredentialController.createProviderCredential
);

/**
 * PATCH /api/admin/provider-credentials/:id
 * Update a provider credential's metadata, or rotate its api_key.
 * requires: provider_keys:manage
 * params: { id: number }
 * body: { provider?: string, name?: string, description?: string, api_key?: string }
 */
router.patch(
  "/:id",
  authorize(PERMISSIONS.PROVIDER_KEYS_MANAGE),
  validate(providerCredentialValidation.updateProviderCredential),
  providerCredentialController.updateProviderCredential
);

/**
 * DELETE /api/admin/provider-credentials/:id
 * Delete a provider credential.
 * requires: provider_keys:manage
 * params: { id: number }
 */
router.delete(
  "/:id",
  authorize(PERMISSIONS.PROVIDER_KEYS_MANAGE),
  validate(providerCredentialValidation.getProviderCredential),
  providerCredentialController.deleteProviderCredential
);

export default router;
