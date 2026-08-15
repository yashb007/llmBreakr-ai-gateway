import Joi from "joi";
import { PERMISSIONS } from "../../config/permissions.js";

const permissionValues = Object.values(PERMISSIONS);

export const getUser = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
};

export const createUser = {
  body: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    name: Joi.string().required(),
    password: Joi.string().min(8).required(),
    is_super_admin: Joi.boolean(),
  }),
};

export const updateUser = {
  params: Joi.object({
    id: Joi.number().integer().required(),
  }),
  body: Joi.object({
    name: Joi.string(),
    status: Joi.string().valid("active", "disabled"),
    password: Joi.string().min(8),
  }).min(1),
};

export const getUserPermission = {
  params: Joi.object({
    id: Joi.number().integer().required(),
    permission: Joi.string()
      .valid(...permissionValues)
      .required(),
  }),
};

export const setUserPermission = {
  params: Joi.object({
    id: Joi.number().integer().required(),
    permission: Joi.string()
      .valid(...permissionValues)
      .required(),
  }),
  body: Joi.object({
    effect: Joi.string().valid("grant", "deny").required(),
  }),
};
