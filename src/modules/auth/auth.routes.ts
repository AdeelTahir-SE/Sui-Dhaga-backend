import { Router } from "express";
import { z } from "zod";
import { supabase } from "../../config/supabase.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { AppError } from "../../utils/app-error.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { success } from "../../utils/api-response.js";

export const authRoutes = Router();
const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
const configured = () => {
  if (!supabase)
    throw new AppError("Authentication service is not configured", 503);
  return supabase;
};

authRoutes.post(
  "/register",
  validate(
    credentials.extend({
      role: z.enum(["customer", "tailor"]).default("customer"),
    }),
  ),
  asyncHandler(async (req, res) => {
    const client = configured();
    const { email, password, role } = req.body;
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) throw new AppError(error.message, 400);
    success(
      res,
      { user: data.user, session: data.session },
      "Registration successful",
      201,
    );
  }),
);
authRoutes.post(
  "/login",
  validate(credentials),
  asyncHandler(async (req, res) => {
    const { data, error } = await configured().auth.signInWithPassword(
      req.body,
    );
    if (error) throw new AppError("Invalid email or password", 401);
    success(
      res,
      { user: data.user, session: data.session },
      "Login successful",
    );
  }),
);
authRoutes.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const { error } = await configured().auth.signOut();
    if (error) throw new AppError(error.message, 400);
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
    const { data, error } = await configured().auth.refreshSession({
      refresh_token: req.body.refreshToken,
    });
    if (error) throw new AppError(error.message, 401);
    success(res, data, "Token refreshed successfully");
  }),
);
authRoutes.post(
  "/forgot-password",
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    await configured().auth.resetPasswordForEmail(req.body.email);
    success(res, null, "If this email exists, a reset link has been sent.");
  }),
);
authRoutes.post(
  "/reset-password",
  requireAuth,
  validate(z.object({ password: z.string().min(8) })),
  asyncHandler(async (req, res) => {
    const { error } = await configured().auth.updateUser({
      password: req.body.password,
    });
    if (error) throw new AppError(error.message, 400);
    success(res, null, "Password reset successful");
  }),
);
authRoutes.post("/verify-email", requireAuth, (_req, res) =>
  success(res, null, "Email verification status fetched"),
);
