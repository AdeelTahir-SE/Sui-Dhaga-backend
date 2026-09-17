import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";


const isDev = env.NODE_ENV === "development" || env.NODE_ENV === "test";

/**
 * Standard rate limiter applied to all API endpoints
 * 200 requests per 15 minutes window in production (skipped in development)
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: () => isDev,
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
 * 15 requests per 15 minutes window in production (skipped in development)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  skip: () => isDev,
  skipSuccessfulRequests: true,
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
 * 20 generations per 10 minutes per IP in production (skipped in development)
 */
export const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  skip: () => isDev,
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
