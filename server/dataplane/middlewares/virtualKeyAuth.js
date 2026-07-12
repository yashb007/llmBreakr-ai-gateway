import httpStatus from "http-status";
import VirtualKey from "../../models/virtualKey.model.js";
import Project from "../../models/project.model.js";
import APIError from "../../utils/APIError.js";
import { hashToken } from "../../utils/token.js";

export const virtualKeyAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new APIError({ message: "Authentication required", status: httpStatus.UNAUTHORIZED });
    }

    const virtualKey = await VirtualKey.findOne({ where: { key_hash: hashToken(token) } });
    if (!virtualKey) {
      throw new APIError({ message: "Invalid API key", status: httpStatus.UNAUTHORIZED });
    }
    if (virtualKey.revoked) {
      throw new APIError({ message: "API key has been revoked", status: httpStatus.UNAUTHORIZED });
    }
    if (virtualKey.expires_at && virtualKey.expires_at < new Date()) {
      throw new APIError({ message: "API key has expired", status: httpStatus.UNAUTHORIZED });
    }

    req.virtualKey = virtualKey;
    req.project = await Project.findByPk(virtualKey.project_id);
    next();
  } catch (error) {
    next(error);
  }
};
