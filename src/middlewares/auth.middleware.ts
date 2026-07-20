import type { RequestHandler } from "express";
import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new AppError("Authentication required", 401));
  if (!supabase) return next(new AppError("Authentication service is not configured", 503));
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return next(new AppError("Invalid or expired access token", 401));
  req.user = data.user;
  req.userRole = data.user.app_metadata.role ?? data.user.user_metadata.role ?? "customer";
  next();
};
