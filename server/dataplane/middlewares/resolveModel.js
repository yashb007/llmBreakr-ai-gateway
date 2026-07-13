import httpStatus from "http-status";
import ProxyModel from "../../models/proxyModel.model.js";
import APIError from "../../utils/APIError.js";
import { logRequest } from "../utils/requestLogger.js";

export const resolveModel = async (req, res, next) => {
  try {
    const modelName = req.body.model;
    if (!modelName) {
      throw new APIError({ message: '"model" is required', status: httpStatus.BAD_REQUEST });
    }

    const proxyModel = await ProxyModel.findOne({ where: { model_name: modelName } });
    if (!proxyModel) {
      await logRequest({
        virtualKeyId: req.virtualKey.id,
        projectId: req.project?.id,
        model: modelName,
        status: httpStatus.NOT_FOUND,
        blockedBy: "model_not_found",
      });
      throw new APIError({ message: `Model "${modelName}" not found`, status: httpStatus.NOT_FOUND });
    }
    if (proxyModel.blocked) {
      await logRequest({
        virtualKeyId: req.virtualKey.id,
        projectId: req.project?.id,
        model: modelName,
        status: httpStatus.FORBIDDEN,
        blockedBy: "model_blocked",
      });
      throw new APIError({ message: `Model "${modelName}" is blocked`, status: httpStatus.FORBIDDEN });
    }

    const allowedModels = req.virtualKey.allowed_models ? JSON.parse(req.virtualKey.allowed_models) : null;
    if (allowedModels && !allowedModels.includes(modelName)) {
      await logRequest({
        virtualKeyId: req.virtualKey.id,
        projectId: req.project?.id,
        model: modelName,
        status: httpStatus.FORBIDDEN,
        blockedBy: "model_not_allowed",
      });
      throw new APIError({
        message: `This API key is not permitted to use model "${modelName}"`,
        status: httpStatus.FORBIDDEN,
      });
    }

    req.proxyModel = proxyModel;
    next();
  } catch (error) {
    next(error);
  }
};
