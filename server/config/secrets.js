// Auto-generates and persists JWT_SECRET / CREDENTIAL_ENCRYPTION_KEY the
// first time either is missing from the environment, so a zero-config run
// (no .env at all) works out of the box while staying stable across
// restarts. Regenerating CREDENTIAL_ENCRYPTION_KEY on every boot would make
// every already-stored provider credential permanently undecryptable, so a
// generated value is written to disk and reused on the next boot exactly
// like an env var would be. Explicit env vars always win over anything
// persisted here.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const secretsPath = path.join(configDir, "..", "data", ".secrets.json");

const loadPersisted = () => {
  try {
    return JSON.parse(fs.readFileSync(secretsPath, "utf8"));
  } catch {
    return {};
  }
};

const persisted = loadPersisted();
let generatedAny = false;

const resolve = (envVar, persistedKey, generate) => {
  if (process.env[envVar]) return process.env[envVar];
  if (persisted[persistedKey]) return persisted[persistedKey];
  const value = generate();
  persisted[persistedKey] = value;
  generatedAny = true;
  return value;
};

export const jwtSecret = resolve("JWT_SECRET", "jwtSecret", () => crypto.randomBytes(48).toString("hex"));

// aes-256-gcm (utils/encryption.js) needs a 32-byte key, hex-encoded.
export const credentialEncryptionKey = resolve("CREDENTIAL_ENCRYPTION_KEY", "credentialEncryptionKey", () =>
  crypto.randomBytes(32).toString("hex")
);

if (generatedAny) {
  fs.mkdirSync(path.dirname(secretsPath), { recursive: true });
  fs.writeFileSync(secretsPath, JSON.stringify(persisted, null, 2), { mode: 0o600 });
  console.warn(
    `[llmbreakr] No JWT_SECRET/CREDENTIAL_ENCRYPTION_KEY set — generated and saved to ${secretsPath}. ` +
      "Fine for trying this out; set your own in production. Don't lose this file, or every " +
      "already-stored provider credential becomes permanently unreadable."
  );
}
