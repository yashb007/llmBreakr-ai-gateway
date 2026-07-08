import httpStatus from "http-status";
import ProxyModel from "../../models/proxyModel.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";

const findModelOr404 = async (id) => {
  const model = await ProxyModel.findByPk(id);
  if (!model) {
    throw new APIError({ message: "Model not found", status: httpStatus.NOT_FOUND });
  }
  return model;
};

export const listModels = async () => {
  return ProxyModel.findAll({ order: [["created_at", "DESC"]] });
};

export const getModel = async (id) => {
  return findModelOr404(id);
};

export const createModel = async ({ model_name, litellm_params }, actor) => {
  const model = await ProxyModel.create({ model_name, litellm_params, created_by: actor.id });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "model.create",
    resource_type: "model",
    resource_id: String(model.id),
    status: "success",
  });

  return model;
};

export const updateModel = async (id, updates, actor) => {
  const model = await findModelOr404(id);

  if (updates.model_name !== undefined) model.model_name = updates.model_name;
  if (updates.litellm_params !== undefined) model.litellm_params = updates.litellm_params;
  if (updates.blocked !== undefined) model.blocked = updates.blocked;
  await model.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "model.update",
    resource_type: "model",
    resource_id: String(model.id),
    metadata: JSON.stringify(updates),
    status: "success",
  });

  return model;
};

export const deleteModel = async (id, actor) => {
  const model = await findModelOr404(id);
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
