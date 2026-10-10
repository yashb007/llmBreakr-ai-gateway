import path from "node:path";
import { fileURLToPath } from "node:url";
import { jwtSecret as generatedJwtSecret, credentialEncryptionKey as generatedCredentialEncryptionKey } from "./secrets.js";

const configDir = path.dirname(fileURLToPath(import.meta.url));

export const port = process.env.PORT || 4000;

// No DB_HOST set -> zero-config mode: an embedded SQLite file instead of
// requiring a MySQL server. Set DB_HOST (and friends) to use MySQL instead.
export const db = process.env.DB_HOST
  ? {
      dialect: "mysql",
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    }
  : {
      dialect: "sqlite",
      // Resolved from this file's own location so it's stable regardless of
      // the process's cwd (differs between `npm run dev` and the Docker image).
      storage: process.env.DB_SQLITE_PATH || path.join(configDir, "..", "data", "llmbreakr.sqlite"),
    };

export const redis = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
};

// Defaults let a zero-config run seed a login-able admin without an .env —
// see models/seed.js, which also hardcodes the initial password to "admin".
export const superAdminEmail = {
    email : process.env.SUPER_ADMIN_EMAIL || "admin@llmbreakr.local",
    name :  process.env.SUPER_ADMIN_NAME || "Admin",
};

export const credentialEncryptionKey = generatedCredentialEncryptionKey;

export const jwtSecret = generatedJwtSecret;
