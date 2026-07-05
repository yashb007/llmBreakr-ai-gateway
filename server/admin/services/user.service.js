import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import User from "../../models/user.model.js";
import Session from "../../models/session.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";

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
  const user = await User.findByPk(id);
  if (!user) {
    throw new APIError({ message: "User not found", status: httpStatus.NOT_FOUND });
  }
  return publicUser(user);
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
  const user = await User.findByPk(id);
  if (!user) {
    throw new APIError({ message: "User not found", status: httpStatus.NOT_FOUND });
  }

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
  const user = await User.findByPk(id);
  if (!user) {
    throw new APIError({ message: "User not found", status: httpStatus.NOT_FOUND });
  }
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
