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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "user@example.com" }
 *               password: { type: string, minLength: 6, example: "Password123!" }
 *               role: { type: string, enum: [customer, tailor, admin], default: customer }
 *     responses:
 *       201:
 *         description: User registered successfully
 */
authRoutes.post("/register", validate(registerSchema), asyncHandler(authController.register));

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate and log in user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "user@example.com" }
 *               password: { type: string, example: "Password123!" }
 *     responses:
 *       200:
 *         description: User logged in successfully, returns JWT session
 */
authRoutes.post("/login", validate(loginSchema), asyncHandler(authController.login));

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Terminate current user session
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
authRoutes.post("/logout", requireAuth, asyncHandler(authController.logout));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get currently authenticated user session
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user profile and session data
 */
authRoutes.get("/me", requireAuth, asyncHandler(authController.getMe));

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using a valid refresh token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: New session tokens returned
 */
authRoutes.post("/refresh-token", validate(refreshTokenSchema), asyncHandler(authController.refreshToken));

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Send password reset link to user email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Password reset email dispatched
 */
authRoutes.post("/forgot-password", validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with updated credentials
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password successfully updated
 */
authRoutes.post("/reset-password", requireAuth, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify authenticated user's email address
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Email verification status confirmation
 */
authRoutes.post("/verify-email", requireAuth, asyncHandler(authController.verifyEmail));

