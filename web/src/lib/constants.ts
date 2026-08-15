// Plain constants with no server-only/runtime dependencies so both
// middleware.ts (edge runtime) and lib/session.ts (Node runtime) can share them.

// Short-lived JWT, sent as the Authorization: Bearer header on every admin
// API call. Mirrors ACCESS_TOKEN_TTL in server/utils/jwt.js (15 min).
export const ACCESS_COOKIE = "access_token";
export const ACCESS_MAX_AGE_SECONDS = 60 * 15;

// Long-lived, DB-backed, revocable opaque token — only ever sent to
// /api/admin/auth/{refresh,logout}, never used to call any other admin
// route directly. Mirrors REFRESH_TOKEN_TTL_MS in
// server/admin/services/auth.service.js (7 days).
export const REFRESH_COOKIE = "refresh_token";
export const REFRESH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
