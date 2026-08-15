import httpStatus from "http-status";
import Project from "../../models/project.model.js";
import ProviderCredential from "../../models/providerCredential.model.js";
import ProjectProviderCredential from "../../models/projectProviderCredential.model.js";
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
  provider_credential_id: row.provider_credential_id,
  provider: row.provider,
  credential_name: row.credential?.name ?? null,
  created_by: row.created_by,
  created_at: row.created_at,
});

const findRowOr404 = async (projectId, rowId) => {
  const row = await ProjectProviderCredential.findOne({
    where: { id: rowId, project_id: projectId },
    include: [{ model: ProviderCredential, as: "credential", attributes: ["id", "name"] }],
  });
  if (!row) {
    throw new APIError({ message: "Project credential not found", status: httpStatus.NOT_FOUND });
  }
  return row;
};

export const listProjectCredentials = async (projectId, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const rows = await ProjectProviderCredential.findAll({
    where: { project_id: projectId },
    include: [{ model: ProviderCredential, as: "credential", attributes: ["id", "name"] }],
    order: [["provider", "ASC"]],
  });
  return rows.map(publicRow);
};

export const addProjectCredential = async (projectId, { provider_credential_id }, actor) => {
  await findAccessibleProjectOr404(projectId, actor);

  const credential = await ProviderCredential.findByPk(provider_credential_id);
  if (!credential) {
    throw new APIError({ message: "Provider credential not found", status: httpStatus.NOT_FOUND });
  }

  let row;
  try {
    row = await ProjectProviderCredential.create({
      project_id: projectId,
      provider_credential_id,
      provider: credential.provider,
      created_by: actor.id,
    });
  } catch (error) {
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new APIError({
        message: `This project already has a credential for provider "${credential.provider}"`,
        status: httpStatus.CONFLICT,
      });
    }
    throw error;
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_credential.add",
    resource_type: "project_provider_credential",
    resource_id: String(row.id),
    metadata: JSON.stringify({ project_id: projectId, provider_credential_id }),
    status: "success",
  });

  return publicRow(await findRowOr404(projectId, row.id));
};

export const removeProjectCredential = async (projectId, rowId, actor) => {
  await findAccessibleProjectOr404(projectId, actor);
  const row = await findRowOr404(projectId, rowId);
  const provider = row.provider;

  await row.destroy();

  // Without a credential for this provider, any project_models rows for it
  // are unreachable — resolveModel.js would still allow the request through,
  // then chat.service.js would fail with a 500 ("no credential configured")
  // instead of a clean 403. Drop them together so the allowlist never points
  // at a provider the project can no longer actually call.
  const providerModelIds = (
    await ProviderModel.findAll({ where: { provider }, attributes: ["id"] })
  ).map((m) => m.id);
  const removedModels = providerModelIds.length
    ? await ProjectModel.destroy({ where: { project_id: projectId, provider_model_id: providerModelIds } })
    : 0;

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project_credential.remove",
    resource_type: "project_provider_credential",
    resource_id: String(rowId),
    metadata: JSON.stringify({ project_id: projectId, provider, removed_models: removedModels }),
    status: "success",
  });

  return { removed_models: removedModels };
};
