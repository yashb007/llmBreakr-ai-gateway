import httpStatus from "http-status";
import ProjectModel from "../../models/projectModel.model.js";
import ProviderModel from "../../models/providerModel.model.js";
import APIError from "../../utils/APIError.js";
import { logRequest } from "../utils/requestLogger.js";

export const resolveModel = async (req, res, next) => {
  try {
    const modelName = req.body.model;
    if (!modelName) {
      throw new APIError({ message: '"model" is required', status: httpStatus.BAD_REQUEST });
    }

    // project_models is the single allowlist gate — a model has to be both in
    // the shared catalog AND explicitly granted to this key's project.
    const projectModel = await ProjectModel.findOne({
      where: { project_id: req.project.id },
      include: [{ model: ProviderModel, as: "providerModel", where: { model_id: modelName } }],
    });
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
    next();
  } catch (error) {
    next(error);
  }
};
