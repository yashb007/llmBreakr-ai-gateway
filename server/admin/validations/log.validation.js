import Joi from "joi";

// Note: express-validation only validates req.query here, it does not mutate
// it (this codebase never passes `{ context: true }` to `validate()`), so
// Joi `.default()` values are never actually applied to req.query — defaults
// are instead applied in log.service.js, matching the rest of the codebase's
// convention of leaving mutation/defaulting to the service layer.
export const listLogs = {
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(200),
    // Comma-separated combo of buckets, e.g. "4xx,5xx" for an "errors" filter tab.
    status: Joi.string().pattern(/^(2xx|4xx|5xx)(,(2xx|4xx|5xx))*$/),
    project_id: Joi.number().integer(),
    virtual_key_id: Joi.number().integer(),
    model: Joi.string(),
    provider: Joi.string(),
    blocked_by: Joi.string(),
    from: Joi.date().iso(),
    to: Joi.date().iso(),
  }),
};
