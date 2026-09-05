import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";


const environment=env.NODE_ENV || "development";
/**
 * Standard rate limiter applied to all API endpoints
 * 200 requests per 15 minutes window
 * 50 requests per 5 minutes window in development
 */
export const apiLimiter = rateLimit({
  windowMs: environment === "production" ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 minutes for production and 5 minutes for development
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError("Too many requests from this IP, please try again after 15 minutes", 429));
  },
});

/**
 * Strict rate limiter for authentication routes (login, register, forgot-password)
 * 15 requests per 15 minutes window to protect against brute-force attacks
 * 50 requests per 5 minutes window in development
 */
export const authLimiter = rateLimit({
  windowMs: environment === "production" ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 minutes for production and 5 minutes for development
  max: environment === "production" ? 15 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(new AppError("Too many authentication attempts. Please try again after 15 minutes.", 429));
  },
});

/**
 * Rate limiter for heavy AI generation routes (text-to-design, image-to-design, sketch-to-design)
 * 20 generations per 10 minutes per IP
 * 50 generations per 5 minutes in development
 */
export const aiLimiter = rateLimit({
  windowMs: environment === "production" ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10 minutes for production and 5 minutes for development
  max: environment === "production" ? 20 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "AI generation rate limit exceeded. Please wait a few minutes before creating new designs.",
  },
  handler: (_req: Request, _res: Response, next: NextFunction) => {
    next(
      new AppError(
        "AI generation rate limit exceeded. Please wait a few minutes before creating new designs.",
        429
      )
    );
  },
});
