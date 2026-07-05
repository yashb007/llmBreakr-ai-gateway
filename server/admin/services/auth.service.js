import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import User from "../../models/user.model.js";
import Session from "../../models/session.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { generateToken, hashToken } from "../../utils/token.js";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

  const token = generateToken();
  await Session.create({
    id: hashToken(token),
    user_id: user.id,
    expires_at: new Date(Date.now() + SESSION_TTL_MS),
    ip,
    user_agent: userAgent,
  });

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

  return { token, user: publicUser(user) };
};

export const logout = async (session, actor) => {
  await Session.destroy({ where: { id: session.id } });
  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "auth.logout",
    status: "success",
  });
};

export const me = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  is_super_admin: user.is_super_admin,
  status: user.status,
  last_login_at: user.last_login_at,
});
