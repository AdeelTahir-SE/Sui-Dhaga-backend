import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { authService } from "./auth.service.js";

export const register: RequestHandler = async (req, res) => {
  const { email, password, role } = req.body;
  const result = await authService.register(email, password, role);
  success(res, result, "Registration successful", 201);
};

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(req.body);
  success(res, result, "Login successful");
};

export const logout: RequestHandler = async (_req, res) => {
  await authService.logout();
  success(res, null, "Logout successful");
};

export const getMe: RequestHandler = (req, res) => {
  success(
    res,
    { user: req.user, role: req.userRole },
    "User fetched successfully",
  );
};

export const refreshToken: RequestHandler = async (req, res) => {
  const result = await authService.refreshToken(req.body.refreshToken);
  success(res, result, "Token refreshed successfully");
};

export const forgotPassword: RequestHandler = async (req, res) => {
  const message = await authService.forgotPassword(req.body.email);
  success(res, null, message);
};

export const resetPassword: RequestHandler = async (req, res) => {
  const message = await authService.resetPassword(req.body.password);
  success(res, null, message);
};

export const verifyEmail: RequestHandler = (_req, res) => {
  success(res, null, "Email verification status fetched");
};
