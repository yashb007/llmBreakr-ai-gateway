import crypto from "crypto";

export const generateToken = () => crypto.randomBytes(32).toString("hex");

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Virtual API keys look like "vk_<48 hex chars>". key_prefix is the non-secret
// leading slice stored for display; the full secret is only ever hashed.
export const generateVirtualKey = () => {
  const secret = `vk_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = secret.slice(0, 11);
  return { secret, prefix };
};
