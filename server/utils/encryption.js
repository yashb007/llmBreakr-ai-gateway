import crypto from "crypto";
import { credentialEncryptionKey } from "../config/vars.js";

const ALGORITHM = "aes-256-gcm";

const getKey = () => Buffer.from(credentialEncryptionKey, "hex");

// Encrypts a plaintext secret into a single "iv:authTag:ciphertext" string (each base64).
export const encrypt = (plaintext) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(":");
};

export const decrypt = (payload) => {
  const [ivB64, authTagB64, ciphertextB64] = payload.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};
