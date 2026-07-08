import Joi from "joi";

const litellmParams = Joi.object({
  provider: Joi.string().required(),
  model: Joi.string().required(),
  api_base: Joi.string().uri().optional(),
  api_key: Joi.string().optional(),
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
    litellm_params: litellmParams,
  }),
};

export const updateModel = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    model_name: Joi.string(),
    litellm_params: litellmParams.optional(),
    blocked: Joi.boolean(),
  }).min(1),
};
