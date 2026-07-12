import Joi from "joi";

const providerParams = Joi.object({
  provider: Joi.string().required(),
  model: Joi.string().required(),
  api_base: Joi.string().uri().optional(),
  provider_credential_id: Joi.number().integer().required(),
})
  .unknown(true)
  .required();

export const getModel = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createModel = {
  body: Joi.object({
    model_name: Joi.string().required(),
    provider_params: providerParams,
  }),
};

export const updateModel = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    model_name: Joi.string(),
    provider_params: providerParams.optional(),
    blocked: Joi.boolean(),
  }).min(1),
};
