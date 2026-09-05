import rateLimit from "express-rate-limit";
import { AppError } from "../utils/app-error.js";

/**
 * Standard rate limiter applied to all API endpoints
 * 200 requests per 15 minutes window
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  handler: (_req, _res, next) => {
    next(new AppError("Too many requests from this IP, please try again after 15 minutes", 429));
  },
});

/**
 * Strict rate limiter for authentication routes (login, register, forgot-password)
 * 15 requests per 15 minutes window to protect against brute-force attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  handler: (_req, _res, next) => {
    next(new AppError("Too many authentication attempts. Please try again after 15 minutes.", 429));
  },
});

/**
 * Rate limiter for heavy AI generation routes (text-to-design, image-to-design, sketch-to-design)
 * 20 generations per 10 minutes per IP
 */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI generation rate limit exceeded. Please wait a few minutes before creating new designs.",
  },
  handler: (_req, _res, next) => {
    next(
      new AppError(
        "AI generation rate limit exceeded. Please wait a few minutes before creating new designs.",
        429
      )
    );
  },
});
