import crypto from "crypto";

// A license key is "LLMBK1.<payload>.<signature>" — payload and signature are
// base64url. The payload is signed as-is (whatever bytes the signer produced),
// so verification never re-serializes it; it just checks the signature against
// the exact string the signer shipped.
const TOKEN_PREFIX = "LLMBK1";

export const signLicense = (payload, privateKeyPem) => {
  const payloadJson = JSON.stringify(payload);
  const signature = crypto.sign(null, Buffer.from(payloadJson, "utf8"), privateKeyPem);

  return [
    TOKEN_PREFIX,
    Buffer.from(payloadJson, "utf8").toString("base64url"),
    signature.toString("base64url"),
  ].join(".");
};

// Returns the decoded payload on a valid, well-formed, signed license key —
// or null for anything else (wrong prefix, bad signature, malformed payload).
// Expiry is intentionally NOT checked here; that's a policy decision left to
// the caller (config/license.js), since "expired" and "invalid" are different
// states worth logging differently.
export const verifyLicense = (licenseKey, publicKeyPem) => {
  if (typeof licenseKey !== "string") return null;

  const parts = licenseKey.trim().split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;

  const [, payloadB64, signatureB64] = parts;

  try {
    const payloadBuf = Buffer.from(payloadB64, "base64url");
    const signature = Buffer.from(signatureB64, "base64url");
    const isValid = crypto.verify(null, payloadBuf, publicKeyPem, signature);
    if (!isValid) return null;

    return JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    return null;
  }
};
