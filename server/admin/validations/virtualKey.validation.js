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
    rpm_limit: Joi.number().integer().min(1).optional(),
    daily_budget_usd: Joi.number().min(0).optional(),
    daily_token_limit: Joi.number().integer().min(1).optional(),
    monthly_token_limit: Joi.number().integer().min(1).optional(),
    expires_at: Joi.date().iso().optional(),
  }),
};

export const updateVirtualKey = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    rpm_limit: Joi.number().integer().min(1).allow(null),
    daily_budget_usd: Joi.number().min(0).allow(null),
    daily_token_limit: Joi.number().integer().min(1).allow(null),
    monthly_token_limit: Joi.number().integer().min(1).allow(null),
    expires_at: Joi.date().iso().allow(null),
  }).min(1),
};
