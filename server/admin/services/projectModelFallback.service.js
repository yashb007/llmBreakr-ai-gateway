import httpStatus from "http-status";
import Project from "../../models/project.model.js";
import ProviderModel from "../../models/providerModel.model.js";
import ProjectModel from "../../models/projectModel.model.js";
import ProjectModelFallback from "../../models/projectModelFallback.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { getAccessibleUserIds } from "../../utils/accessScope.js";

// 404 rather than 403 for out-of-scope projects — same convention as
// project.service.js's findAccessibleProjectOr404.
const findAccessibleProjectOr404 = async (projectId, actor) => {
  const project = await Project.findByPk(projectId);
  const accessibleUserIds = await getAccessibleUserIds(actor);
  if (!project || (accessibleUserIds && !accessibleUserIds.includes(project.created_by))) {
    throw new APIError({ message: "Project not found", status: httpStatus.NOT_FOUND });
  }
  return project;
};

const modelInclude = (as) => ({
  model: ProjectModel,
  as,
  attributes: ["id"],
  include: [{ model: ProviderModel, as: "providerModel", attributes: ["id", "provider", "model_id"] }],
});

const publicRow = (row) => ({
  id: row.id,
  project_id: row.project_id,
  priority: row.priority,
  primary_project_model_id: row.primary_project_model_id,
  primary_model: row.primaryModel?.providerModel
    ? { provider: row.primaryModel.providerModel.provider, model_id: row.primaryModel.providerModel.model_id }
    : null,
  fallback_project_model_id: row.fallback_project_model_id,
  fallback_model: row.fallbackModel?.providerModel
    ? { provider: row.fallbackModel.providerModel.provider, model_id: row.fallbackModel.providerModel.model_id }
    : null,
  created_by: row.created_by,
  created_at: row.created_at,
});

const findRowOr404 = async (projectId, rowId) => {
  const row = await ProjectModelFallback.findOne({
    where: { id: rowId, project_id: projectId },
    include: [modelInclude("primaryModel"), modelInclude("fallbackModel")],
  });
  if (!row) {
    throw new APIError({ message: "Fallback not found", status: httpStatus.NOT_FOUND });
  }
  return row;
};

// Confirms a project_models row both exists and belongs to this project —
// same guarantee resolveModel.js relies on at request time: a fallback can
// only ever point at a model the project has already been explicitly
// granted, never the raw provider_models catalog directly.
const assertOwnedProjectModel = async (projectId, projectModelId, label) => {
  const row = await ProjectModel.findOne({ where: { id: projectModelId, project_id: projectId } });
  if (!row) {
    throw new APIError({ message: `${label} model is not allowed for this project`, status: httpStatus.BAD_REQUEST });
  }
};

export const listFallbacks = async (projectId, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const rows = await ProjectModelFallback.findAll({
    where: { project_id: projectId },
    include: [modelInclude("primaryModel"), modelInclude("fallbackModel")],
    order: [
      ["primary_project_model_id", "ASC"],
      ["priority", "ASC"],
    ],
  });
  return rows.map(publicRow);
};

export const addFallback = async (projectId, { primary_project_model_id, fallback_project_model_id, priority }, actor) => {
  await findAccessibleProjectOr404(projectId, actor);

  if (primary_project_model_id === fallback_project_model_id) {
    throw new APIError({ message: "A model cannot be its own fallback", status: httpStatus.BAD_REQUEST });
  }
  await assertOwnedProjectModel(projectId, primary_project_model_id, "Primary");
  await assertOwnedProjectModel(projectId, fallback_project_model_id, "Fallback");

  let row;
  try {
    row = await ProjectModelFallback.create({
      project_id: projectId,
      primary_project_model_id,
      fallback_project_model_id,
      priority: priority ?? 0,
      created_by: actor.id,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new APIError({ message: "This fallback is already configured", status: httpStatus.CONFLICT });
    }
    throw error;
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_model_fallback.add",
    resource_type: "project_model_fallback",
    resource_id: String(row.id),
    metadata: JSON.stringify({ project_id: projectId, primary_project_model_id, fallback_project_model_id }),
    status: "success",
  });

  return publicRow(await findRowOr404(projectId, row.id));
};

export const updateFallbackPriority = async (projectId, rowId, priority, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const row = await findRowOr404(projectId, rowId);

  row.priority = priority;
  await row.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_model_fallback.update",
    resource_type: "project_model_fallback",
    resource_id: String(rowId),
    metadata: JSON.stringify({ priority }),
    status: "success",
  });

  return publicRow(await findRowOr404(projectId, rowId));
};

export const removeFallback = async (projectId, rowId, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const row = await findRowOr404(projectId, rowId);

  await row.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_model_fallback.remove",
    resource_type: "project_model_fallback",
    resource_id: String(rowId),
    metadata: JSON.stringify({ project_id: projectId }),
    status: "success",
  });
};
