import httpStatus from "http-status";
import Project from "../../models/project.model.js";
import ProviderModel from "../../models/providerModel.model.js";
import ProjectModel from "../../models/projectModel.model.js";
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

const publicRow = (row) => ({
  id: row.id,
  project_id: row.project_id,
  provider_model_id: row.provider_model_id,
  provider: row.providerModel?.provider ?? null,
  model_id: row.providerModel?.model_id ?? null,
  created_by: row.created_by,
  created_at: row.created_at,
});

const findRowOr404 = async (projectId, rowId) => {
  const row = await ProjectModel.findOne({
    where: { id: rowId, project_id: projectId },
    include: [{ model: ProviderModel, as: "providerModel", attributes: ["id", "provider", "model_id"] }],
  });
  if (!row) {
    throw new APIError({ message: "Project model not found", status: httpStatus.NOT_FOUND });
  }
  return row;
};

export const listProjectModels = async (projectId, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const rows = await ProjectModel.findAll({
    where: { project_id: projectId },
    include: [{ model: ProviderModel, as: "providerModel", attributes: ["id", "provider", "model_id"] }],
    order: [["created_at", "DESC"]],
  });
  return rows.map(publicRow);
};

export const addProjectModel = async (projectId, { provider_model_id }, actor) => {
  await findAccessibleProjectOr404(projectId, actor);

  const providerModel = await ProviderModel.findByPk(provider_model_id);
  if (!providerModel) {
    throw new APIError({ message: "Model not found", status: httpStatus.NOT_FOUND });
  }

  let row;
  try {
    row = await ProjectModel.create({
      project_id: projectId,
      provider_model_id,
      created_by: actor.id,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new APIError({
        message: `Model "${providerModel.model_id}" is already allowed for this project`,
        status: httpStatus.CONFLICT,
      });
    }
    throw error;
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_model.add",
    resource_type: "project_model",
    resource_id: String(row.id),
    metadata: JSON.stringify({ project_id: projectId, provider_model_id }),
    status: "success",
  });

  return publicRow(await findRowOr404(projectId, row.id));
};

export const removeProjectModel = async (projectId, rowId, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const row = await findRowOr404(projectId, rowId);

  await row.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_model.remove",
    resource_type: "project_model",
    resource_id: String(rowId),
    metadata: JSON.stringify({ project_id: projectId }),
    status: "success",
  });
};
