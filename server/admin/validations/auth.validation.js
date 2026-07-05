import Joi from "joi";

export const login = {
  body: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().required(),
  }),
};
