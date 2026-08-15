import httpStatus from "http-status";
import { ValidationError } from "express-validation";
import APIError from "../utils/APIError.js";

export const converter = (err, req, res, next) => {
  let error = err;
  if (err instanceof ValidationError) {
    error = new APIError({
      message: "Validation Error",
      errors: err.details,
      status: httpStatus.BAD_REQUEST,
    });
  } else if (!(err instanceof APIError)) {
    const status = err.status || httpStatus.INTERNAL_SERVER_ERROR;
    error = new APIError({ message: err.message || httpStatus[status], status });
  }
  return next(error);
};

export const notFound = (req, res, next) => {
  next(new APIError({ message: "Not found", status: httpStatus.NOT_FOUND }));
};

// eslint-disable-next-line no-unused-vars
export const handler = (err, req, res, next) => {
  const status = err.status || httpStatus.INTERNAL_SERVER_ERROR;
  const isDevelopment = process.env.NODE_ENV !== "production";

  const message =
    status === httpStatus.INTERNAL_SERVER_ERROR && !isDevelopment
      ? "An internal server error occurred"
      : err.message;

  res.status(status).json({
    code: status,
    message,
    ...(err.errors && { errors: err.errors }),
    ...(isDevelopment && { stack: err.stack }),
  });
};
