import httpStatus from "http-status";
import ProviderCredential from "../../models/providerCredential.model.js";
import AuditLog from "../../models/auditLog.model.js";
import APIError from "../../utils/APIError.js";
import { encrypt } from "../../utils/encryption.js";

// The raw API key is never returned once stored — only this metadata shape.
const publicCredential = (credential) => ({
  id: credential.id,
  provider: credential.provider,
  name: credential.name,
  description: credential.description,
  created_by: credential.created_by,
  created_at: credential.created_at,
});

const findCredentialOr404 = async (id) => {
  const credential = await ProviderCredential.findByPk(id);
  if (!credential) {
    throw new APIError({ message: "Provider credential not found", status: httpStatus.NOT_FOUND });
  }
  return credential;
};

export const listProviderCredentials = async () => {
  const credentials = await ProviderCredential.findAll({ order: [["created_at", "DESC"]] });
  return credentials.map(publicCredential);
};

export const getProviderCredential = async (id) => {
  return publicCredential(await findCredentialOr404(id));
};

export const createProviderCredential = async ({ provider, name, description, api_key }, actor) => {
  const credential = await ProviderCredential.create({
    provider,
    name,
    description,
    encrypted_key: encrypt(api_key),
    created_by: actor.id,
  });

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "provider_credential.create",
    resource_type: "provider_credential",
    resource_id: String(credential.id),
    status: "success",
  });

  return publicCredential(credential);
};

export const updateProviderCredential = async (id, updates, actor) => {
  const credential = await findCredentialOr404(id);

  if (updates.provider !== undefined) credential.provider = updates.provider;
  if (updates.name !== undefined) credential.name = updates.name;
  if (updates.description !== undefined) credential.description = updates.description;
  if (updates.api_key) credential.encrypted_key = encrypt(updates.api_key);
  await credential.save();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "provider_credential.update",
    resource_type: "provider_credential",
    resource_id: String(credential.id),
    metadata: JSON.stringify({ ...updates, api_key: updates.api_key ? "[redacted]" : undefined }),
    status: "success",
  });

  return publicCredential(credential);
};

export const deleteProviderCredential = async (id, actor) => {
  const credential = await findCredentialOr404(id);
  await credential.destroy();

  await AuditLog.create({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_type: "user",
    action: "provider_credential.delete",
    resource_type: "provider_credential",
    resource_id: String(id),
    status: "success",
  });
};
