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

  const isAppError = error instanceof AppError || error?.name === "AppError";
  const statusCode = (error as any)?.statusCode || (isAppError ? 400 : 500);
  const message = error?.message || "Internal server error";

  if (statusCode >= 500) {
    console.error("Internal Server Error:", error);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(error?.errors ? { errors: error.errors } : {}),
  });
};
