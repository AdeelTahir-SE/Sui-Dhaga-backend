import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { authService } from "./auth.service.js";

export const register: RequestHandler = async (req, res) => {
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const result = await authService.register(req.body, requestOrigin);
  const message = result.confirmationResent
    ? "Confirmation email re-sent. Please check your inbox."
    : result.emailConfirmationRequired
      ? "Registration successful. Please confirm your email address."
      : "Registration successful";
  success(res, result, message, 201);
};

export const resendConfirmation: RequestHandler = async (req, res) => {
  const requestOrigin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  const result = await authService.resendConfirmation(req.body, requestOrigin);
  success(res, result, "Confirmation email sent successfully");
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
  const userId = req.user?.id;
  const { password, token, email } = req.body;
  const message = await authService.resetPassword({ password, userId, token, email });
  success(res, null, message);
};

export const verifyEmail: RequestHandler = (_req, res) => {
  success(res, null, "Email verification status fetched");
};

export const googleAuth: RequestHandler = async (req, res) => {
  const result = await authService.googleAuth(req.body);
  success(res, result, "Google authentication successful");
};

export const completeProfile: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  const result = await authService.completeProfile(userId!, req.body);
  success(res, result, "Profile completed successfully");
};

export const getGoogleAuthUrl: RequestHandler = (req, res) => {
  const redirectUri = typeof req.query.redirectUri === "string" ? req.query.redirectUri : undefined;
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const url = authService.getGoogleAuthUrl(redirectUri, baseUrl);
  success(res, { url }, "Google auth URL fetched");
};

export const googleCallback: RequestHandler = async (req, res) => {
  const appRedirect = typeof req.query.appRedirect === "string" ? req.query.appRedirect : undefined;
  const tokenHash = typeof req.query.token_hash === "string" ? req.query.token_hash : undefined;
  const type = typeof req.query.type === "string" ? req.query.type : undefined;

  let verification: { accessToken?: string; refreshToken?: string; error?: string } | undefined;
  if (tokenHash && type) {
    verification = await authService.verifyCallbackTokenHash(tokenHash, type);
  }

  const html = authService.renderGoogleCallbackHtml(appRedirect, verification);
  res.setHeader("Content-Type", "text/html");
  res.send(html);
};

export const changePassword: RequestHandler = async (req, res) => {
  const message = await authService.changePassword(req.user!.id, req.body);
  success(res, null, message);
};
