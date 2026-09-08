import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { AppError } from "../utils/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ success: false, message: "File size exceeds the allowed limit (max 5MB)" });
    }
    return res.status(400).json({ success: false, message: error.message });
  }

  const appError = error instanceof AppError ? error : new AppError("Internal server error");
  if (!(error instanceof AppError)) console.error(error);
  res.status(appError.statusCode).json({ success: false, message: appError.message, ...(appError.errors ? { errors: appError.errors } : {}) });
};
