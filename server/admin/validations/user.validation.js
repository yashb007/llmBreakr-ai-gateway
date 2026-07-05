import Joi from "joi";

export const getUser = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createUser = {
  body: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    name: Joi.string().required(),
    password: Joi.string().min(8).required(),
    is_super_admin: Joi.boolean(),
  }),
};

export const updateUser = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    status: Joi.string().valid("active", "disabled"),
    password: Joi.string().min(8),
  }).min(1),
};
