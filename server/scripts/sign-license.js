import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { signLicense } from "../utils/license.js";

// Issues a signed enterprise license key. Requires the private key generated
// by scripts/generate-license-keypair.js — this script only ever runs on
// your machine, never in the OSS codebase's runtime path.
//
// Usage:
//   node server/scripts/sign-license.js <customer> <entitlements> <seats> <expires_at> [tier]
//   node server/scripts/sign-license.js "Acme Corp" sso,scim,audit-export 50 2027-01-01 enterprise
//
// <entitlements> is a comma-separated list of feature flags, each set to true.
// <expires_at> is any Date-parseable string, or "never" for a perpetual license.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const privateKeyPath = path.join(__dirname, "..", ".license-private-key.pem");

const [customer, entitlementsArg, seatsArg, expiresArg, tier = "enterprise"] = process.argv.slice(2);

if (!customer || !entitlementsArg || !seatsArg || !expiresArg) {
  console.error(
    "usage: node server/scripts/sign-license.js <customer> <entitlements> <seats> <expires_at> [tier]"
  );
  process.exit(1);
}

if (!fs.existsSync(privateKeyPath)) {
  console.error(
    `no private key at ${privateKeyPath} — run node server/scripts/generate-license-keypair.js first.`
  );
  process.exit(1);
}

const seats = Number(seatsArg);
if (!Number.isInteger(seats) || seats <= 0) {
  console.error(`seats must be a positive integer, got "${seatsArg}"`);
  process.exit(1);
}

let expiresAt = null;
if (expiresArg !== "never") {
  const parsed = new Date(expiresArg);
  if (Number.isNaN(parsed.getTime())) {
    console.error(`could not parse expires_at "${expiresArg}" as a date`);
    process.exit(1);
  }
  expiresAt = parsed.toISOString();
}

const entitlements = Object.fromEntries(
  entitlementsArg
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e) => [e, true])
);

const privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");

const licenseKey = signLicense(
  {
    license_id: crypto.randomUUID(),
    customer,
    tier,
    entitlements,
    seats,
    issued_at: new Date().toISOString(),
    expires_at: expiresAt,
  },
  privateKeyPem
);

console.log(licenseKey);
