import httpStatus from "http-status";

export default class APIError extends Error {
  constructor({ message, status = httpStatus.INTERNAL_SERVER_ERROR, errors, isPublic = true }) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.errors = errors;
    this.isPublic = isPublic;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}
