import Joi from "joi";

export const listFallbacks = {
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
};

export const addFallback = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    primary_project_model_id: Joi.number().integer().required(),
    fallback_project_model_id: Joi.number().integer().required(),
    priority: Joi.number().integer().min(0),
  }),
};

export const updateFallbackPriority = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    priority: Joi.number().integer().min(0).required(),
  }),
};

export const removeFallback = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
};
