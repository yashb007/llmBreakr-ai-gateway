import Joi from "joi";

export const getModel = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const updateModel = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    input_price_per_million: Joi.number().min(0).allow(null),
    output_price_per_million: Joi.number().min(0).allow(null),
    cache_write_price_per_million: Joi.number().min(0).allow(null),
    cache_read_price_per_million: Joi.number().min(0).allow(null),
  }).min(1),
};
