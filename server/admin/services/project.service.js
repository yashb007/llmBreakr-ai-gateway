import httpStatus from "http-status";
import Project from "../../models/project.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { getAccessibleUserIds } from "../../utils/accessScope.js";

const findAccessibleProjectOr404 = async (id, actor) => {
  const project = await Project.findByPk(id);
  const accessibleUserIds = await getAccessibleUserIds(actor);

  // 404 rather than 403 for out-of-scope projects — they should be as
  // invisible to a non-super-admin as one that doesn't exist at all.
  if (!project || (accessibleUserIds && !accessibleUserIds.includes(project.created_by))) {
    throw new APIError({ message: "Project not found", status: httpStatus.NOT_FOUND });
  }
  return project;
};

export const listProjects = async (actor) => {
  const accessibleUserIds = await getAccessibleUserIds(actor);
  return Project.findAll({
    where: accessibleUserIds ? { created_by: accessibleUserIds } : undefined,
    order: [["created_at", "DESC"]],
  });
};

export const listProjectOptions = async () => {
  return Project.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] });
};

export const getProject = async (id, actor) => {
  return findAccessibleProjectOr404(id, actor);
};

export const createProject = async (
  { name, description, daily_budget_usd, rpm_limit, daily_token_limit, monthly_token_limit },
  actor
) => {
  const project = await Project.create({
    name,
    description,
    daily_budget_usd,
    rpm_limit,
    daily_token_limit,
    monthly_token_limit,
    created_by: actor.id,
  });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project.create",
    resource_type: "project",
    resource_id: String(project.id),
    status: "success",
  });

  return project;
};

export const updateProject = async (id, updates, actor) => {
  const project = await findAccessibleProjectOr404(id, actor);

  if (updates.name !== undefined) project.name = updates.name;
  if (updates.description !== undefined) project.description = updates.description;
  if (updates.daily_budget_usd !== undefined) project.daily_budget_usd = updates.daily_budget_usd;
  if (updates.rpm_limit !== undefined) project.rpm_limit = updates.rpm_limit;
  if (updates.daily_token_limit !== undefined) project.daily_token_limit = updates.daily_token_limit;
  if (updates.monthly_token_limit !== undefined) project.monthly_token_limit = updates.monthly_token_limit;
  await project.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project.update",
    resource_type: "project",
    resource_id: String(project.id),
    metadata: JSON.stringify(updates),
    status: "success",
  });

  return project;
};

export const deleteProject = async (id, actor) => {
  const project = await findAccessibleProjectOr404(id, actor);

  await project.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project.delete",
    resource_type: "project",
    resource_id: String(id),
    status: "success",
  });
};
