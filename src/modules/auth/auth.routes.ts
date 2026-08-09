import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { success } from "../../utils/api-response.js";
import { authService } from "./auth.service.js";

export const authRoutes = Router();

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

authRoutes.post(
  "/register",
  validate(
    credentials.extend({
      role: z.enum(["customer", "tailor"]).default("customer"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const { email, password, role } = req.body;
    const result = await authService.register(email, password, role);
    success(res, result, "Registration successful", 201);
  }),
);

authRoutes.post(
  "/login",
  validate(credentials),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    success(res, result, "Login successful");
  }),
);

authRoutes.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req, res) => {
    await authService.logout();
    success(res, null, "Logout successful");
  }),
);

authRoutes.get("/me", requireAuth, (req, res) =>
  success(
    res,
    { user: req.user, role: req.userRole },
    "User fetched successfully",
  ),
);

authRoutes.post(
  "/refresh-token",
  validate(z.object({ refreshToken: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const result = await authService.refreshToken(req.body.refreshToken);
    success(res, result, "Token refreshed successfully");
  }),
);

authRoutes.post(
  "/forgot-password",
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const message = await authService.forgotPassword(req.body.email);
    success(res, null, message);
  }),
);

authRoutes.post(
  "/reset-password",
  requireAuth,
  validate(z.object({ password: z.string().min(8) })),
  asyncHandler(async (req, res) => {
    const message = await authService.resetPassword(req.body.password);
    success(res, null, message);
  }),
);

authRoutes.post("/verify-email", requireAuth, (_req, res) =>
  success(res, null, "Email verification status fetched"),
);
