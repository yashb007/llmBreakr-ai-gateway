import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/vars.js";

// Deliberately short — this is the maximum window a stolen or
// already-issued access token keeps working after logout/password-change,
// since neither of those touches an access token already handed out (only
// the refresh token, which is DB-backed and revocable). Disabling a user
// doesn't have this gap: authenticate() re-fetches the user row and checks
// `status` on every request regardless of token validity.
const ACCESS_TOKEN_TTL = "15m";

// `sid` is the refresh token's (hashed) session id — carried in the access
// token purely so authenticate() can populate req.session without a DB
// lookup, letting logout/change-password act on "the session this access
// token came from" without re-deriving it.
export const signAccessToken = ({ userId, sessionId }) =>
  jwt.sign({ sub: userId, sid: sessionId }, jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });

export const verifyAccessToken = (token) => jwt.verify(token, jwtSecret);
