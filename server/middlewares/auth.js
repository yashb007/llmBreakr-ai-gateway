import httpStatus from "http-status";
import { Op } from "sequelize";
import Session from "../models/session.model.js";
import User from "../models/user.model.js";
import APIError from "../utils/APIError.js";
import { hashToken } from "../utils/token.js";

export const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      throw new APIError({ message: "Authentication required", status: httpStatus.UNAUTHORIZED });
    }

    const session = await Session.findOne({
      where: { id: hashToken(token), expires_at: { [Op.gt]: new Date() } },
    });
    if (!session) {
      throw new APIError({ message: "Invalid or expired session", status: httpStatus.UNAUTHORIZED });
    }

    const user = await User.findByPk(session.user_id);
    if (!user || user.status !== "active") {
      throw new APIError({ message: "Account is disabled", status: httpStatus.UNAUTHORIZED });
    }

    req.user = user;
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};
