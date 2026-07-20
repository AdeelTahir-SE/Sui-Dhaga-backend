import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError = error instanceof AppError ? error : new AppError("Internal server error");
  if (!(error instanceof AppError)) console.error(error);
  res.status(appError.statusCode).json({ success: false, message: appError.message, ...(appError.errors ? { errors: appError.errors } : {}) });
};
