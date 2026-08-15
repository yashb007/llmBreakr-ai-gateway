import Joi from "joi";

export const listProjectModels = {
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
};

export const addProjectModel = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    provider_model_id: Joi.number().integer().required(),
  }),
};

export const removeProjectModel = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
};
