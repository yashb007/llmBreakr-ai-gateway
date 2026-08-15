import httpStatus from "http-status";
import ProviderModel from "../../models/providerModel.model.js";
import ProjectModel from "../../models/projectModel.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { decrypt } from "../../utils/encryption.js";
import { PROVIDERS } from "../../providers/index.js";

const serializeModel = (model) => ({
  id: model.id,
  provider: model.provider,
  model_id: model.model_id,
  input_price_per_million: model.input_price_per_million,
  output_price_per_million: model.output_price_per_million,
  cache_write_price_per_million: model.cache_write_price_per_million,
  cache_read_price_per_million: model.cache_read_price_per_million,
  created_at: model.created_at,
});

const findModelOr404 = async (id) => {
  const model = await ProviderModel.findByPk(id);
  if (!model) {
    throw new APIError({ message: "Model not found", status: httpStatus.NOT_FOUND });
  }
  return model;
};

export const listModels = async () => {
  const models = await ProviderModel.findAll({ order: [["provider", "ASC"], ["model_id", "ASC"]] });
  return models.map(serializeModel);
};

export const getModel = async (id) => {
  return serializeModel(await findModelOr404(id));
};

// Called right after a provider credential is created: pulls that provider's
// full model catalog and adds any the gateway doesn't already know about,
// so an admin can grant projects access to them (project_models) without
// hand-entering every model. Purely a catalog sync — it doesn't grant any
// project access on its own.
export const syncModelsForCredential = async (credential, actor) => {
  const adapter = PROVIDERS[credential.provider];
  if (!adapter?.listModels) return { created: 0, skipped: 0 };

  const apiKey = decrypt(credential.encrypted_key);
  const modelIds = await adapter.listModels({ apiKey });

  let created = 0;
  let skipped = 0;
  for (const modelId of modelIds) {
    const [, wasCreated] = await ProviderModel.findOrCreate({ where: { provider: credential.provider, model_id: modelId } });
    if (wasCreated) created++;
    else skipped++;
  }

  if (created) {
    await AuditLog.create({
      actor_id: actor.id,
      actor_email: actor.email,
      actor_type: "user",
      action: "model.sync",
      resource_type: "provider_credential",
      resource_id: String(credential.id),
      metadata: JSON.stringify({ provider: credential.provider, created, skipped }),
      status: "success",
    });
  }

  return { created, skipped };
};

export const updateModel = async (
  id,
  { input_price_per_million, output_price_per_million, cache_write_price_per_million, cache_read_price_per_million },
  actor
) => {
  const model = await findModelOr404(id);

  if (input_price_per_million !== undefined) model.input_price_per_million = input_price_per_million;
  if (output_price_per_million !== undefined) model.output_price_per_million = output_price_per_million;
  if (cache_write_price_per_million !== undefined) model.cache_write_price_per_million = cache_write_price_per_million;
  if (cache_read_price_per_million !== undefined) model.cache_read_price_per_million = cache_read_price_per_million;
  await model.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "model.update",
    resource_type: "model",
    resource_id: String(model.id),
    metadata: JSON.stringify({
      input_price_per_million,
      output_price_per_million,
      cache_write_price_per_million,
      cache_read_price_per_million,
    }),
    status: "success",
  });

  return getModel(model.id);
};

export const deleteModel = async (id, actor) => {
  const model = await findModelOr404(id);

  const inUseCount = await ProjectModel.count({ where: { provider_model_id: id } });
  if (inUseCount > 0) {
    throw new APIError({
      message: `Cannot delete: ${inUseCount} project(s) still have this model allowed`,
      status: httpStatus.CONFLICT,
    });
  }

  await model.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "model.delete",
    resource_type: "model",
    resource_id: String(id),
    status: "success",
  });
};
