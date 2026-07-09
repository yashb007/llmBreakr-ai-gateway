import Joi from "joi";

export const getProject = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createProject = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().required(),
  }),
};

export const updateProject = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    description: Joi.string(),
  }).min(1),
};
