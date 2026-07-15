import httpStatus from "http-status";
import VirtualKey from "../../models/virtualKey.model.js";
import Project from "../../models/project.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { generateVirtualKey, hashToken } from "../../utils/token.js";

// The raw secret is never persisted or returned again after creation — only key_hash/key_prefix are.
const publicVirtualKey = (key) => ({
  id: key.id,
  project_id: key.project_id,
  name: key.name,
  key_prefix: key.key_prefix,
  allowed_models: key.allowed_models ? JSON.parse(key.allowed_models) : null,
  rpm_limit: key.rpm_limit,
  daily_budget_usd: key.daily_budget_usd,
  expires_at: key.expires_at,
  revoked: key.revoked,
  approved: key.approved,
  approved_by: key.approved_by,
  approved_at: key.approved_at,
  created_by: key.created_by,
  created_at: key.created_at,
});

const findVirtualKeyOr404 = async (id) => {
  const key = await VirtualKey.findByPk(id);
  if (!key) {
    throw new APIError({ message: "Virtual key not found", status: httpStatus.NOT_FOUND });
  }
  return key;
};

export const listVirtualKeys = async () => {
  const keys = await VirtualKey.findAll({ order: [["created_at", "DESC"]] });
  return keys.map(publicVirtualKey);
};

export const getVirtualKey = async (id) => {
  return publicVirtualKey(await findVirtualKeyOr404(id));
};

export const createVirtualKey = async (
  { project_id, name, allowed_models, rpm_limit, daily_budget_usd, expires_at },
  actor
) => {
  const project = await Project.findByPk(project_id);
  if (!project) {
    throw new APIError({ message: "Project not found", status: httpStatus.NOT_FOUND });
  }

  const { secret, prefix } = generateVirtualKey();

  // Every new key starts unapproved regardless of who creates it — it can't
  // authenticate data-plane requests (see virtualKeyAuth.js) until someone
  // holding virtual_keys:manage approves it.
  const key = await VirtualKey.create({
    project_id,
    name,
    key_hash: hashToken(secret),
    key_prefix: prefix,
    allowed_models: allowed_models ? JSON.stringify(allowed_models) : null,
    rpm_limit,
    daily_budget_usd,
    expires_at,
    approved: false,
    created_by: actor.id,
  });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "virtual_key.create",
    resource_type: "virtual_key",
    resource_id: String(key.id),
    status: "success",
  });

  // Only place the raw secret is ever exposed — the caller must save it now.
  return { ...publicVirtualKey(key), key: secret };
};

export const updateVirtualKey = async (id, updates, actor) => {
  const key = await findVirtualKeyOr404(id);

  if (updates.name !== undefined) key.name = updates.name;
  if (updates.allowed_models !== undefined) {
    key.allowed_models = updates.allowed_models ? JSON.stringify(updates.allowed_models) : null;
  }
  if (updates.rpm_limit !== undefined) key.rpm_limit = updates.rpm_limit;
  if (updates.daily_budget_usd !== undefined) key.daily_budget_usd = updates.daily_budget_usd;
  if (updates.expires_at !== undefined) key.expires_at = updates.expires_at;
  await key.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "virtual_key.update",
    resource_type: "virtual_key",
    resource_id: String(key.id),
    metadata: JSON.stringify(updates),
    status: "success",
  });

  return publicVirtualKey(key);
};

export const approveVirtualKey = async (id, actor) => {
  const key = await findVirtualKeyOr404(id);
  if (key.approved) {
    throw new APIError({ message: "Key is already approved", status: httpStatus.CONFLICT });
  }

  key.approved = true;
  key.approved_by = actor.id;
  key.approved_at = new Date();
  await key.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "virtual_key.approve",
    resource_type: "virtual_key",
    resource_id: String(key.id),
    status: "success",
  });

  return publicVirtualKey(key);
};

export const revokeVirtualKey = async (id, actor) => {
  const key = await findVirtualKeyOr404(id);
  key.revoked = true;
  await key.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "virtual_key.revoke",
    resource_type: "virtual_key",
    resource_id: String(key.id),
    status: "success",
  });

  return publicVirtualKey(key);
};

export const deleteVirtualKey = async (id, actor) => {
  const key = await findVirtualKeyOr404(id);
  await key.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "virtual_key.delete",
    resource_type: "virtual_key",
    resource_id: String(id),
    status: "success",
  });
};
