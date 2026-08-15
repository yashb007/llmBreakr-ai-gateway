import httpStatus from "http-status";
import { Op } from "sequelize";
import VirtualKey from "../../models/virtualKey.model.js";
import Project from "../../models/project.model.js";
import ProviderModel from "../../models/providerModel.model.js";
import ProjectModel from "../../models/projectModel.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { generateVirtualKey, hashToken } from "../../utils/token.js";
import { getAccessibleUserIds } from "../../utils/accessScope.js";
import * as chatService from "../../dataplane/services/chat.service.js";

// Fixed, minimal prompt for the admin "test" button — the point is to verify
// the key can reach its provider end-to-end, not to have a conversation.
const TEST_MESSAGE = "Reply with exactly one word: OK";

// The raw secret is never persisted or returned again after creation — only key_hash/key_prefix are.
const publicVirtualKey = (key) => ({
  id: key.id,
  project_id: key.project_id,
  name: key.name,
  key_prefix: key.key_prefix,
  rpm_limit: key.rpm_limit,
  daily_budget_usd: key.daily_budget_usd,
  daily_token_limit: key.daily_token_limit,
  monthly_token_limit: key.monthly_token_limit,
  expires_at: key.expires_at,
  revoked: key.revoked,
  approved: key.approved,
  approved_by: key.approved_by,
  approved_at: key.approved_at,
  created_by: key.created_by,
  created_at: key.created_at,
});

// A key is in scope if its own creator shares a role with the actor, or if
// the project it belongs to is (project ownership cascades to every key
// inside it, regardless of who issued that specific key).
const getAccessScope = async (actor) => {
  const accessibleUserIds = await getAccessibleUserIds(actor);
  if (!accessibleUserIds) return null; // super admin — no filter
  const projects = await Project.findAll({
    where: { created_by: accessibleUserIds },
    attributes: ["id"],
  });
  return { accessibleUserIds, accessibleProjectIds: projects.map((p) => p.id) };
};

const isKeyAccessible = (key, scope) =>
  !scope || scope.accessibleUserIds.includes(key.created_by) || scope.accessibleProjectIds.includes(key.project_id);

const findVirtualKeyOr404 = async (id) => {
  const key = await VirtualKey.findByPk(id);
  if (!key) {
    throw new APIError({ message: "Virtual key not found", status: httpStatus.NOT_FOUND });
  }
  return key;
};

// 404 rather than 403 for out-of-scope keys — as invisible to a non-super-admin as one that doesn't exist.
const findAccessibleVirtualKeyOr404 = async (id, actor) => {
  const key = await findVirtualKeyOr404(id);
  const scope = await getAccessScope(actor);
  if (!isKeyAccessible(key, scope)) {
    throw new APIError({ message: "Virtual key not found", status: httpStatus.NOT_FOUND });
  }
  return key;
};

export const listVirtualKeys = async (actor) => {
  const scope = await getAccessScope(actor);
  const keys = await VirtualKey.findAll({
    where: scope
      ? { [Op.or]: [{ created_by: scope.accessibleUserIds }, { project_id: scope.accessibleProjectIds }] }
      : undefined,
    order: [["created_at", "DESC"]],
  });
  return keys.map(publicVirtualKey);
};

export const getVirtualKey = async (id, actor) => {
  return publicVirtualKey(await findAccessibleVirtualKeyOr404(id, actor));
};

export const createVirtualKey = async (
  { project_id, name, rpm_limit, daily_budget_usd, daily_token_limit, monthly_token_limit, expires_at },
  actor
) => {
  // Creating under any existing project is allowed regardless of role scope —
  // only viewing/editing is role-scoped (see getAccessScope below). The key
  // becomes visible to its creator immediately via the "own creations" rule.
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
    rpm_limit,
    daily_budget_usd,
    daily_token_limit,
    monthly_token_limit,
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
  const key = await findAccessibleVirtualKeyOr404(id, actor);

  if (updates.name !== undefined) key.name = updates.name;
  if (updates.rpm_limit !== undefined) key.rpm_limit = updates.rpm_limit;
  if (updates.daily_budget_usd !== undefined) key.daily_budget_usd = updates.daily_budget_usd;
  if (updates.daily_token_limit !== undefined) key.daily_token_limit = updates.daily_token_limit;
  if (updates.monthly_token_limit !== undefined) key.monthly_token_limit = updates.monthly_token_limit;
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
  const key = await findAccessibleVirtualKeyOr404(id, actor);
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
  const key = await findAccessibleVirtualKeyOr404(id, actor);
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

// Runs one real, minimal chat completion through the key's own provider/model
// config — same code path a real client hits (dataplane/services/chat.service.js),
// just invoked directly with an admin-picked model instead of through the
// public /v1/chat/completions route, since the admin panel never holds the
// key's raw secret needed to authenticate there. Never throws for an
// expected/business-logic failure (revoked, unapproved, provider error,
// etc.) — those come back as { ok: false, error } so the UI can render an
// inline result instead of a generic error toast.
export const testVirtualKey = async (id, actor) => {
  const key = await findAccessibleVirtualKeyOr404(id, actor);
  const result = await runTest(key);
  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "virtual_key.test",
    resource_type: "virtual_key",
    resource_id: String(key.id),
    metadata: JSON.stringify({ model: result.model ?? null }),
    status: result.ok ? "success" : "failure",
  });

  return result;
};

const runTest = async (key) => {
  if (key.revoked) return { ok: false, error: "This key has been revoked" };
  if (!key.approved) return { ok: false, error: "This key is pending approval" };
  if (key.expires_at && new Date(key.expires_at) < new Date()) return { ok: false, error: "This key has expired" };

  // Picks the first model the key's project is allowed to call — mirrors
  // resolveModel.js's allowlist gate at real request time.
  const projectModel = await ProjectModel.findOne({
    where: { project_id: key.project_id },
    include: [{ model: ProviderModel, as: "providerModel" }],
    order: [["id", "ASC"]],
  });
  if (!projectModel) {
    return { ok: false, error: "No models are allowed for this project yet" };
  }
  const { providerModel } = projectModel;
  const modelName = providerModel.model_id;

  const project = await Project.findByPk(key.project_id);

  const startedAt = Date.now();
  let captured = null;
  const captureRes = { json: (body) => { captured = body; } };

  try {
    await chatService.handleChatCompletion({
      virtualKey: key,
      project,
      providerModel,
      body: { model: modelName, messages: [{ role: "user", content: TEST_MESSAGE }], max_completion_tokens: 5, stream: false },
      res: captureRes,
    });
    return {
      ok: true,
      model: modelName,
      latency_ms: Date.now() - startedAt,
      reply: captured?.choices?.[0]?.message?.content?.trim() ?? null,
    };
  } catch (error) {
    return {
      ok: false,
      model: modelName,
      latency_ms: Date.now() - startedAt,
      error: error.message,
    };
  }
};

export const deleteVirtualKey = async (id, actor) => {
  const key = await findAccessibleVirtualKeyOr404(id, actor);
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
