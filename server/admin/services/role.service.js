import httpStatus from "http-status";
import Role from "../../models/role.model.js";
import RolePermission from "../../models/rolePermission.model.js";
import UserRole from "../../models/userRole.model.js";
import User from "../../models/user.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";

const withPermissions = async (role) => {
  const grants = await RolePermission.findAll({ where: { role_id: role.id } });
  return { ...role.toJSON(), permissions: grants.map((grant) => grant.permission) };
};

const findRoleOr404 = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) {
    throw new APIError({ message: "Role not found", status: httpStatus.NOT_FOUND });
  }
  return role;
};

export const listRoles = async () => {
  const roles = await Role.findAll({ order: [["created_at", "DESC"]] });
  return Promise.all(roles.map(withPermissions));
};

export const getRole = async (id) => {
  return withPermissions(await findRoleOr404(id));
};

export const createRole = async ({ name, description, permissions = [] }, actor) => {
  const existing = await Role.findOne({ where: { name } });
  if (existing) {
    throw new APIError({ message: "Role name already in use", status: httpStatus.CONFLICT });
  }

  const role = await Role.create({ name, description });
  if (permissions.length) {
    await RolePermission.bulkCreate(permissions.map((permission) => ({ role_id: role.id, permission })));
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "role.create",
    resource_type: "role",
    resource_id: String(role.id),
    status: "success",
  });

  return withPermissions(role);
};

export const updateRole = async (id, updates, actor) => {
  const role = await findRoleOr404(id);

  if (updates.name !== undefined) role.name = updates.name;
  if (updates.description !== undefined) role.description = updates.description;
  await role.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "role.update",
    resource_type: "role",
    resource_id: String(role.id),
    metadata: JSON.stringify(updates),
    status: "success",
  });

  return withPermissions(role);
};

export const deleteRole = async (id, actor) => {
  const role = await findRoleOr404(id);
  if (role.is_system) {
    throw new APIError({ message: "System roles cannot be deleted", status: httpStatus.BAD_REQUEST });
  }

  await role.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "role.delete",
    resource_type: "role",
    resource_id: String(id),
    status: "success",
  });
};

export const setRolePermissions = async (id, permissions, actor) => {
  const role = await findRoleOr404(id);

  await RolePermission.destroy({ where: { role_id: role.id } });
  if (permissions.length) {
    await RolePermission.bulkCreate(permissions.map((permission) => ({ role_id: role.id, permission })));
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "role.set_permissions",
    resource_type: "role",
    resource_id: String(role.id),
    metadata: JSON.stringify({ permissions }),
    status: "success",
  });

  return withPermissions(role);
};

export const listRoleUsers = async (roleId) => {
  await findRoleOr404(roleId);

  const userRoles = await UserRole.findAll({ where: { role_id: roleId } });
  const userIds = userRoles.map((userRole) => userRole.user_id);
  if (!userIds.length) return [];

  const users = await User.findAll({ where: { id: userIds } });
  return users.map((user) => ({ id: user.id, email: user.email, name: user.name }));
};

export const assignRole = async (roleId, userId, actor) => {
  const role = await findRoleOr404(roleId);
  const user = await User.findByPk(userId);
  if (!user) {
    throw new APIError({ message: "User not found", status: httpStatus.NOT_FOUND });
  }

  const existing = await UserRole.findOne({ where: { user_id: userId, role_id: roleId } });
  if (existing) {
    throw new APIError({ message: "User already has this role", status: httpStatus.CONFLICT });
  }

  await UserRole.create({ user_id: userId, role_id: roleId, granted_by: actor.id });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "role.assign",
    resource_type: "user_role",
    resource_id: `${userId}:${roleId}`,
    status: "success",
  });

  return { user_id: userId, role_id: role.id };
};

export const revokeRole = async (roleId, userId, actor) => {
  const deleted = await UserRole.destroy({ where: { user_id: userId, role_id: roleId } });
  if (!deleted) {
    throw new APIError({ message: "User does not have this role", status: httpStatus.NOT_FOUND });
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "role.revoke",
    resource_type: "user_role",
    resource_id: `${userId}:${roleId}`,
    status: "success",
  });
};
