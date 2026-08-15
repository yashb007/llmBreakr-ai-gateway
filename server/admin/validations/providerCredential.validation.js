import Joi from "joi";

export const getProviderCredential = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createProviderCredential = {
  body: Joi.object({
    provider: Joi.string().required(),
    name: Joi.string().required(),
    description: Joi.string().required(),
    api_key: Joi.string().required(),
  }),
};

export const updateProviderCredential = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    provider: Joi.string(),
    name: Joi.string(),
    description: Joi.string(),
    api_key: Joi.string(),
  }).min(1),
};
