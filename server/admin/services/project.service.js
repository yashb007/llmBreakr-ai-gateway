import httpStatus from "http-status";
import Project from "../../models/project.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";

export const listProjects = async () => {
  return Project.findAll({ order: [["created_at", "DESC"]] });
};

export const getProject = async (id) => {
  const project = await Project.findByPk(id);
  if (!project) {
    throw new APIError({ message: "Project not found", status: httpStatus.NOT_FOUND });
  }
  return project;
};

export const createProject = async ({ name }, actor) => {
  const project = await Project.create({ name, created_by: actor.id });

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

export const updateProject = async (id, { name }, actor) => {
  const project = await Project.findByPk(id);
  if (!project) {
    throw new APIError({ message: "Project not found", status: httpStatus.NOT_FOUND });
  }

  project.name = name;
  await project.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "project.update",
    resource_type: "project",
    resource_id: String(project.id),
    metadata: JSON.stringify({ name }),
    status: "success",
  });

  return project;
};

export const deleteProject = async (id, actor) => {
  const project = await Project.findByPk(id);
  if (!project) {
    throw new APIError({ message: "Project not found", status: httpStatus.NOT_FOUND });
  }

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
