import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import APIError from "../utils/APIError.js";
import { verifyAccessToken } from "../utils/jwt.js";

// No DB lookup for the token itself — its signature and expiry are enough
// to trust `sub` (user id) and `sid` (session id). The user row is still
// re-fetched every request so a disabled account is rejected immediately,
// not just once the access token naturally expires.
export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new APIError({ message: "Authentication required", status: httpStatus.UNAUTHORIZED });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      const message = err instanceof jwt.TokenExpiredError ? "Access token expired" : "Invalid access token";
      throw new APIError({ message, status: httpStatus.UNAUTHORIZED });
    }

    const user = await User.findByPk(payload.sub);
    if (!user || user.status !== "active") {
      throw new APIError({ message: "Account is disabled", status: httpStatus.UNAUTHORIZED });
    }

    req.user = user;
    req.session = { id: payload.sid };
    next();
  } catch (error) {
    next(error);
  }
};
