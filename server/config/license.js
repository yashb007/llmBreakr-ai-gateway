import fs from "fs";
import { verifyLicense } from "../utils/license.js";
import { LICENSE_PUBLIC_KEY } from "./licensePublicKey.js";

// Self-hosters with no license key at all is the default, expected case —
// every entitlement is simply off, nothing crashes or degrades. A license
// key only ever turns capabilities ON; its absence is not an error.
const COMMUNITY_LICENSE = {
  valid: true,
  tier: "community",
  customer: null,
  entitlements: {},
  seats: null,
  expires_at: null,
};

// A license key can be handed in directly (LLMBREAKR_LICENSE_KEY) or as a
// path to a file containing it (LLMBREAKR_LICENSE_FILE) — keys are long
// enough that a file is often more convenient to deploy than an env var.
const readLicenseKey = () => {
  if (process.env.LLMBREAKR_LICENSE_KEY) return process.env.LLMBREAKR_LICENSE_KEY.trim();

  if (process.env.LLMBREAKR_LICENSE_FILE) {
    try {
      return fs.readFileSync(process.env.LLMBREAKR_LICENSE_FILE, "utf8").trim();
    } catch (err) {
      console.warn(`could not read LLMBREAKR_LICENSE_FILE (${process.env.LLMBREAKR_LICENSE_FILE}): ${err.message}`);
      return null;
    }
  }

  return null;
};

// Verified once at boot and cached — a license doesn't change without a
// restart, so there's no reason to re-verify the signature per request.
const loadLicense = () => {
  const licenseKey = readLicenseKey();
  if (!licenseKey) return COMMUNITY_LICENSE;

  const payload = verifyLicense(licenseKey, LICENSE_PUBLIC_KEY);
  if (!payload) {
    console.warn("LLMBREAKR license key is present but failed signature verification — running as community edition.");
    return COMMUNITY_LICENSE;
  }

  if (payload.expires_at && new Date(payload.expires_at).getTime() < Date.now()) {
    console.warn(`LLMBREAKR license for "${payload.customer}" expired on ${payload.expires_at} — running as community edition.`);
    return COMMUNITY_LICENSE;
  }

  console.info(`LLMBREAKR license loaded: ${payload.tier} tier for "${payload.customer}" (${payload.seats} seats).`);
  return {
    valid: true,
    tier: payload.tier,
    customer: payload.customer,
    entitlements: payload.entitlements || {},
    seats: payload.seats,
    expires_at: payload.expires_at,
  };
};

let cachedLicense = null;

export const getLicense = () => {
  if (!cachedLicense) cachedLicense = loadLicense();
  return cachedLicense;
};

export const hasEntitlement = (name) => Boolean(getLicense().entitlements[name]);
