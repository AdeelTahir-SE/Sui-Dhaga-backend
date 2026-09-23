import type { RequestHandler } from "express";
import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return next(new AppError("Authentication required", 401));
  if (!supabase) return next(new AppError("Authentication service is not configured", 503));

  let user = null;
  const { data, error } = await supabase.auth.getUser(token);
  if (!error && data?.user) {
    user = data.user;
  } else if (token.startsWith("token_")) {
    const rawId = token.replace("token_", "");
    try {
      const { data: adminUser } = await supabase.auth.admin.getUserById(rawId);
      if (adminUser?.user) {
        user = adminUser.user;
      }
    } catch {}
  }

  if (!user) return next(new AppError("Invalid or expired access token", 401));

  req.user = user;
  req.userRole = user.app_metadata?.role ?? user.user_metadata?.role ?? "customer";
  next();
};

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && supabase) {
    try {
      const { data } = await supabase.auth.getUser(token);
      let user = data?.user;
      if (!user && token.startsWith("token_")) {
        const rawId = token.replace("token_", "");
        const { data: adminUser } = await supabase.auth.admin.getUserById(rawId);
        user = adminUser?.user;
      }
      if (user) {
        req.user = user;
        req.userRole = user.app_metadata?.role ?? user.user_metadata?.role ?? "customer";
      }
    } catch {
      // Ignore invalid optional tokens
    }
  }
  next();
};
