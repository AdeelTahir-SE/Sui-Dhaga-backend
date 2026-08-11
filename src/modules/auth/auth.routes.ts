import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as authController from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validator.js";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), asyncHandler(authController.register));
authRoutes.post("/login", validate(loginSchema), asyncHandler(authController.login));
authRoutes.post("/logout", requireAuth, asyncHandler(authController.logout));
authRoutes.get("/me", requireAuth, asyncHandler(authController.getMe));
authRoutes.post("/refresh-token", validate(refreshTokenSchema), asyncHandler(authController.refreshToken));
authRoutes.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
authRoutes.post("/reset-password", requireAuth, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));
authRoutes.post("/verify-email", requireAuth, asyncHandler(authController.verifyEmail));
