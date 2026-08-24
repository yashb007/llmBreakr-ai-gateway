import httpStatus from "http-status";
import APIError from "../../utils/APIError.js";
import { hashToken } from "../../utils/token.js";
import { logRequest } from "../utils/requestLogger.js";
import { mark } from "../utils/timing.js";
import { resolveKeyContext } from "../utils/keyContext.js";

export const virtualKeyAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new APIError({ message: "Authentication required", status: httpStatus.UNAUTHORIZED });
    }

    // One consolidated, cached lookup instead of a separate VirtualKey +
    // Project query — see dataplane/utils/keyContext.js.
    const virtualKey = await resolveKeyContext(hashToken(token));
    if (!virtualKey) {
      // No identity to attach the row to — nothing meaningful to log against.
      throw new APIError({ message: "Invalid API key", status: httpStatus.UNAUTHORIZED });
    }
    if (virtualKey.revoked) {
      await logRequest({
        virtualKeyId: virtualKey.id,
        projectId: virtualKey.project_id,
        model: req.body?.model,
        status: httpStatus.UNAUTHORIZED,
        blockedBy: "revoked",
      });
      throw new APIError({ message: "API key has been revoked", status: httpStatus.UNAUTHORIZED });
    }
    if (!virtualKey.approved) {
      await logRequest({
        virtualKeyId: virtualKey.id,
        projectId: virtualKey.project_id,
        model: req.body?.model,
        status: httpStatus.UNAUTHORIZED,
        blockedBy: "pending_approval",
      });
      throw new APIError({
        message: "API key is pending approval",
        status: httpStatus.UNAUTHORIZED,
      });
    }
    if (virtualKey.expires_at && new Date(virtualKey.expires_at) < new Date()) {
      await logRequest({
        virtualKeyId: virtualKey.id,
        projectId: virtualKey.project_id,
        model: req.body?.model,
        status: httpStatus.UNAUTHORIZED,
        blockedBy: "expired",
      });
      throw new APIError({ message: "API key has expired", status: httpStatus.UNAUTHORIZED });
    }

    req.virtualKey = virtualKey;
    req.project = virtualKey.project;
    mark(req, "auth");
    next();
  } catch (error) {
    next(error);
  }
};
