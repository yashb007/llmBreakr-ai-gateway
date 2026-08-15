import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Op } from "sequelize";
import User from "../../models/user.model.js";
import Session from "../../models/session.model.js";
import AuditLog from "../../models/auditLog.model.js";
import UserRole from "../../models/userRole.model.js";
import Role from "../../models/role.model.js";
import APIError from "../../utils/APIError.js";
import { generateToken, hashToken } from "../../utils/token.js";
import { signAccessToken } from "../../utils/jwt.js";
import { getUserPermissions } from "./user.service.js";
import { PERMISSIONS } from "../../config/permissions.js";

// The refresh token is the long-lived, DB-backed, revocable credential (same
// shape the old session token was) — its only job is minting new short-lived
// access tokens via refresh() below. The access token is a self-contained
// JWT (see utils/jwt.js): every protected route verifies it by signature and
// expiry alone, no DB round trip for the token itself.
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  is_super_admin: user.is_super_admin,
});

export const login = async ({ email, password, ip, userAgent }) => {
  const user = await User.findOne({ where: { email } });
  const valid = user && (await bcrypt.compare(password, user.password_hash));

  if (!user || !valid || user.status !== "active") {
    await AuditLog.create({
      actor_email: email,
      actor_type: "user",
      action: "auth.login_failed",
      status: "failure",
      ip,
      user_agent: userAgent,
    });
    throw new APIError({ message: "Invalid email or password", status: httpStatus.UNAUTHORIZED });
  }

  const refreshToken = generateToken();
  const session = await Session.create({
    id: hashToken(refreshToken),
    user_id: user.id,
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    ip,
    user_agent: userAgent,
  });

  const accessToken = signAccessToken({ userId: user.id, sessionId: session.id });

  user.last_login_at = new Date();
  await user.save();

  await AuditLog.create({
    actor_id: user.id,
    actor_email: user.email,
    actor_type: "user",
    action: "auth.login",
    status: "success",
    ip,
    user_agent: userAgent,
  });

  return { access_token: accessToken, refresh_token: refreshToken, user: publicUser(user) };
};

// Exchanges a still-valid refresh token for a new short-lived access token.
// Doesn't rotate the refresh token itself — it keeps its original expiry
// from login, same as it always did.
export const refresh = async (refreshToken) => {
  const session = await Session.findOne({
    where: { id: hashToken(refreshToken), expires_at: { [Op.gt]: new Date() } },
  });
  if (!session) {
    throw new APIError({ message: "Invalid or expired session", status: httpStatus.UNAUTHORIZED });
  }

  const user = await User.findByPk(session.user_id);
  if (!user || user.status !== "active") {
    throw new APIError({ message: "Account is disabled", status: httpStatus.UNAUTHORIZED });
  }

  return { access_token: signAccessToken({ userId: user.id, sessionId: session.id }) };
};

// Revokes the refresh token directly rather than going through authenticate()
// — logout still works even if the access token backing it has already
// expired, instead of depending on the client having refreshed recently.
export const logout = async (refreshToken) => {
  const session = await Session.findOne({ where: { id: hashToken(refreshToken) } });
  if (!session) return;

  await Session.destroy({ where: { id: session.id } });
  await AuditLog.create({
    actor_id: session.user_id,
    actor_type: "user",
    action: "auth.logout",
    status: "success",
  });
};

// Super admins bypass every permission check, so their "roles" are whatever
// they happen to hold (usually none) and their "permissions" are everything —
// listing the actual constants is more useful on a profile page than an empty array.
export const me = async (user) => {
  if (user.is_super_admin) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      is_super_admin: true,
      status: user.status,
      last_login_at: user.last_login_at,
      roles: [],
      permissions: Object.values(PERMISSIONS),
    };
  }

  const userRoles = await UserRole.findAll({ where: { user_id: user.id } });
  const roleIds = userRoles.map((userRole) => userRole.role_id);
  const roles = roleIds.length
    ? await Role.findAll({ where: { id: roleIds }, attributes: ["id", "name"], order: [["name", "ASC"]] })
    : [];

  const { effective } = await getUserPermissions(user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    is_super_admin: false,
    status: user.status,
    last_login_at: user.last_login_at,
    roles: roles.map((role) => ({ id: role.id, name: role.name })),
    permissions: effective,
  };
};

export const changePassword = async (user, { current_password, new_password }, currentSessionId) => {
  const valid = await bcrypt.compare(current_password, user.password_hash);
  if (!valid) {
    throw new APIError({ message: "Current password is incorrect", status: httpStatus.BAD_REQUEST });
  }

  user.password_hash = await bcrypt.hash(new_password, 10);
  await user.save();

  // Changing your password logs out every other session — only the one
  // making this change stays valid, so a stolen token can't outlive it.
  await Session.destroy({ where: { user_id: user.id, id: { [Op.ne]: currentSessionId } } });

  await AuditLog.create({
    actor_id: user.id,
    actor_email: user.email,
    actor_type: "user",
    action: "auth.change_password",
    status: "success",
  });
};
