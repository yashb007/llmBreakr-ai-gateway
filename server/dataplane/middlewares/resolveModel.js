import httpStatus from "http-status";
import APIError from "../../utils/APIError.js";
import { logRequest } from "../utils/requestLogger.js";
import { mark } from "../utils/timing.js";

export const resolveModel = async (req, res, next) => {
  try {
    const modelName = req.body.model;
    if (!modelName) {
      throw new APIError({ message: '"model" is required', status: httpStatus.BAD_REQUEST });
    }

    // No query here anymore — virtualKeyAuth's consolidated lookup already
    // fetched every model this project is allowed to call. This is now a
    // pure in-memory lookup against that already-fetched list.
    const projectModels = req.project?.ProjectModels || [];
    const projectModel = projectModels.find((pm) => pm.providerModel?.model_id === modelName);
    if (!projectModel) {
      await logRequest({
        virtualKeyId: req.virtualKey.id,
        projectId: req.project?.id,
        model: modelName,
        status: httpStatus.FORBIDDEN,
        blockedBy: "model_not_allowed",
      });
      throw new APIError({
        message: `Model "${modelName}" is not allowed for this project`,
        status: httpStatus.FORBIDDEN,
      });
    }

    req.providerModel = projectModel.providerModel;
    mark(req, "resolveModel");
    next();
  } catch (error) {
    next(error);
  }
};
