import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import User from "../../models/user.model.js";
import Session from "../../models/session.model.js";
import AuditLog from "../../models/auditLog.model.js";
import UserRole from "../../models/userRole.model.js";
import RolePermission from "../../models/rolePermission.model.js";
import UserPermission from "../../models/userPermission.model.js";
import APIError from "../../utils/APIError.js";

const findUserOr404 = async (id) => {
  const user = await User.findByPk(id);
  if (!user) {
    throw new APIError({ message: "User not found", status: httpStatus.NOT_FOUND });
  }
  return user;
};

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  is_super_admin: user.is_super_admin,
  status: user.status,
  created_at: user.created_at,
  last_login_at: user.last_login_at,
});

export const listUsers = async () => {
  const users = await User.findAll({ order: [["created_at", "DESC"]] });
  return users.map(publicUser);
};

export const getUser = async (id) => {
  return publicUser(await findUserOr404(id));
};

export const createUser = async ({ email, name, password, is_super_admin }, actor) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new APIError({ message: "Email already in use", status: httpStatus.CONFLICT });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    name,
    password_hash,
    is_super_admin: !!is_super_admin,
    created_by: actor.id,
  });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "user.create",
    resource_type: "user",
    resource_id: String(user.id),
    status: "success",
  });

  return publicUser(user);
};

export const updateUser = async (id, updates, actor) => {
  const user = await findUserOr404(id);

  if (updates.name !== undefined) user.name = updates.name;
  if (updates.status !== undefined) user.status = updates.status;
  if (updates.password) user.password_hash = await bcrypt.hash(updates.password, 10);
  await user.save();

  if (updates.status === "disabled") {
    await Session.destroy({ where: { user_id: user.id } });
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "user.update",
    resource_type: "user",
    resource_id: String(user.id),
    metadata: JSON.stringify(updates),
    status: "success",
  });

  return publicUser(user);
};

export const deleteUser = async (id, actor) => {
  const user = await findUserOr404(id);
  if (user.id === actor.id) {
    throw new APIError({ message: "Cannot delete your own account", status: httpStatus.BAD_REQUEST });
  }

  await user.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "user.delete",
    resource_type: "user",
    resource_id: String(id),
    status: "success",
  });
};

// Combines what the user's roles grant with their individual overrides:
// a "deny" override removes a role-granted permission, a "grant" override
// adds a permission beyond what any of their roles give them.
export const getUserPermissions = async (userId) => {
  await findUserOr404(userId);

  const userRoles = await UserRole.findAll({ where: { user_id: userId } });
  const roleIds = userRoles.map((userRole) => userRole.role_id);
  const rolePermissions = roleIds.length
    ? [...new Set((await RolePermission.findAll({ where: { role_id: roleIds } })).map((rp) => rp.permission))]
    : [];

  const overrides = await UserPermission.findAll({ where: { user_id: userId } });
  const grants = overrides.filter((override) => override.effect === "grant").map((o) => o.permission);
  const denies = overrides.filter((override) => override.effect === "deny").map((o) => o.permission);

  const effective = [...new Set([...rolePermissions, ...grants])].filter(
    (permission) => !denies.includes(permission)
  );

  return {
    role_permissions: rolePermissions,
    overrides: overrides.map((override) => ({
      permission: override.permission,
      effect: override.effect,
    })),
    effective,
  };
};

export const setUserPermission = async (userId, permission, effect, actor) => {
  await findUserOr404(userId);

  await UserPermission.upsert({
    user_id: userId,
    permission,
    effect,
    granted_by: actor.id,
    granted_at: new Date(),
  });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "user.permission.set",
    resource_type: "user_permission",
    resource_id: `${userId}:${permission}`,
    metadata: JSON.stringify({ effect }),
    status: "success",
  });

  return { user_id: Number(userId), permission, effect };
};

export const removeUserPermission = async (userId, permission, actor) => {
  const deleted = await UserPermission.destroy({ where: { user_id: userId, permission } });
  if (!deleted) {
    throw new APIError({ message: "Permission override not found", status: httpStatus.NOT_FOUND });
  }

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "user.permission.remove",
    resource_type: "user_permission",
    resource_id: `${userId}:${permission}`,
    status: "success",
  });
};
