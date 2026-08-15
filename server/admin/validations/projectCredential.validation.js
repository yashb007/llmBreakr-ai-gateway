import Joi from "joi";

export const listProjectCredentials = {
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
};

export const addProjectCredential = {
  body: Joi.object({
    project_id: Joi.number().integer().required(),
    provider_credential_id: Joi.number().integer().required(),
  }),
};

export const removeProjectCredential = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  query: Joi.object({
    project_id: Joi.number().integer().required(),
  }),
};
