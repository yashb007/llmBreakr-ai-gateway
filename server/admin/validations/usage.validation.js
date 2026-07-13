import Joi from "joi";

// See log.validation.js for why defaults are applied in the service layer
// rather than via Joi `.default()` here.
export const getUsage = {
  query: Joi.object({
    range: Joi.string().valid("24h", "7d", "30d"),
    project_id: Joi.number().integer(),
  }),
};
