import Joi from "joi";
import { PERMISSIONS } from "../../config/permissions.js";

const permissionValues = Object.values(PERMISSIONS);

export const getRole = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createRole = {
  body: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow("").optional(),
    permissions: Joi.array().items(Joi.string().valid(...permissionValues)),
  }),
};

export const updateRole = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    description: Joi.string().allow(""),
  }).min(1),
};

export const setPermissions = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    permissions: Joi.array()
      .items(Joi.string().valid(...permissionValues))
      .required(),
  }),
};

export const assignRole = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    user_id: Joi.number().integer().required(),
  }),
};

export const revokeRole = {
  params: Joi.object({
    id: Joi.number().integer().required(),
    userId: Joi.number().integer().required(),
  }),
};
