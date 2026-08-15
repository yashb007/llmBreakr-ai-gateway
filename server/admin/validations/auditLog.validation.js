import Joi from "joi";

export const listAuditLogs = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(200),
    actor_id: Joi.number().integer(),
    action: Joi.string(),
    resource_type: Joi.string(),
    resource_id: Joi.string(),
    status: Joi.string(),
    from: Joi.date().iso(),
    to: Joi.date().iso(),
  }),
};
