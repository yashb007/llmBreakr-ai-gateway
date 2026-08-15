import Joi from "joi";

export const login = {
  body: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().required(),
  }),
};

export const refresh = {
  body: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

export const logout = {
  body: Joi.object({
    refresh_token: Joi.string().required(),
  }),
};

export const changePassword = {
  body: Joi.object({
    current_password: Joi.string().required(),
    new_password: Joi.string().min(8).required(),
  }),
};
