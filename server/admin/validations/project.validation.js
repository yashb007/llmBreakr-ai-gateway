import Joi from "joi";

export const getProject = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createProject = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
    daily_budget_usd: Joi.number().min(0).optional(),
    rpm_limit: Joi.number().integer().min(1).optional(),
    daily_token_limit: Joi.number().integer().min(1).optional(),
    monthly_token_limit: Joi.number().integer().min(1).optional(),
  }),
};

export const updateProject = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
    daily_budget_usd: Joi.number().min(0).allow(null),
    rpm_limit: Joi.number().integer().min(1).allow(null),
    daily_token_limit: Joi.number().integer().min(1).allow(null),
    monthly_token_limit: Joi.number().integer().min(1).allow(null),
  }).min(1),
};
