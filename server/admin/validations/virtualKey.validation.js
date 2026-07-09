import Joi from "joi";

export const getVirtualKey = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createVirtualKey = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    name: Joi.string().required(),
    allowed_models: Joi.array().items(Joi.string()).optional(),
    rpm_limit: Joi.number().integer().min(1).optional(),
    daily_budget_usd: Joi.number().min(0).optional(),
    expires_at: Joi.date().iso().optional(),
  }),
};

export const updateVirtualKey = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    allowed_models: Joi.array().items(Joi.string()).allow(null),
    rpm_limit: Joi.number().integer().min(1).allow(null),
    daily_budget_usd: Joi.number().min(0).allow(null),
    expires_at: Joi.date().iso().allow(null),
  }).min(1),
};
