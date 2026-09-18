import { Router } from "express";
import { requireAuth, optionalAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { authLimiter } from "../../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as authController from "./auth.controller.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleAuthSchema,
  completeProfileSchema,
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
 *               password: { type: string, minLength: 8, example: "Password123!" }
 *               role: { type: string, enum: [customer, tailor], default: customer }
 *               name: { type: string, example: "Ayesha Khan" }
 *               phone: { type: string, example: "+923001234567" }
 *     responses:
 *       201:
 *         description: User registered successfully
 */
authRoutes.post("/register", authLimiter, validate(registerSchema), asyncHandler(authController.register));

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
authRoutes.post("/login", authLimiter, validate(loginSchema), asyncHandler(authController.login));

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
authRoutes.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), asyncHandler(authController.forgotPassword));

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
authRoutes.post("/reset-password", optionalAuth, authLimiter, validate(resetPasswordSchema), asyncHandler(authController.resetPassword));

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

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Authenticate via Google OAuth or token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accessToken: { type: string }
 *               token: { type: string }
 *               email: { type: string, format: email }
 *               name: { type: string }
 *               avatar: { type: string }
 *               phone: { type: string }
 *     responses:
 *       200:
 *         description: Google authentication successful
 */
authRoutes.post("/google", authLimiter, validate(googleAuthSchema), asyncHandler(authController.googleAuth));

/**
 * @swagger
 * /auth/google-url:
 *   get:
 *     summary: Get Google OAuth initiation URL
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: redirectUri
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Google OAuth URL returned
 */
authRoutes.get("/google-url", asyncHandler(authController.getGoogleAuthUrl));

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback bridge for mobile and web deep linking
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: appRedirect
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: HTML bridge that deep links tokens back to mobile app
 */
authRoutes.get("/google/callback", authController.googleCallback);

/**
 * @swagger
 * /auth/complete-profile:
 *   post:
 *     summary: Complete user profile (select role and phone number)
 *     tags: [Auth]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [customer, tailor] }
 *               phone: { type: string }
 *               name: { type: string }
 *               shopName: { type: string }
 *               city: { type: string }
 *               address: { type: string }
 *     responses:
 *       200:
 *         description: Profile completed successfully
 */
authRoutes.post("/complete-profile", requireAuth, validate(completeProfileSchema), asyncHandler(authController.completeProfile));


