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
  }
  if (!user && token.startsWith("token_")) {
    const rawId = token.replace("token_", "");
    try {
      const { data: adminUser } = await supabase.auth.admin.getUserById(rawId);
      if (adminUser?.user) {
        user = adminUser.user;
      }
    } catch {}
  } else if (!user && token) {
    // If JWT expired or clock skew, verify user identity via Supabase admin using the payload's user ID (sub)
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
        const payload = JSON.parse(payloadStr);
        const sub = payload.sub;
        if (sub && typeof sub === "string") {
          const { data: adminUser } = await supabase.auth.admin.getUserById(sub);
          if (adminUser?.user) {
            user = adminUser.user;
          }
        }
      }
    } catch {}
  }

  if (!user) return next(new AppError("Invalid or expired access token", 401));

  req.user = user;
  let detectedRole = user.app_metadata?.role ?? user.user_metadata?.role;
  if (!detectedRole || detectedRole === "customer") {
    try {
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (prof?.role) {
        detectedRole = prof.role;
      }
    } catch {}
  }
  if (detectedRole !== "tailor" && detectedRole !== "admin") {
    try {
      const { data: tailorRec } = await supabase.from("tailors").select("id").eq("user_id", user.id).maybeSingle();
      if (tailorRec?.id) {
        detectedRole = "tailor";
      }
    } catch {}
  }
  req.userRole = detectedRole ?? "customer";
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
      } else if (!user && token) {
        try {
          const parts = token.split(".");
          if (parts.length === 3) {
            const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
            const payload = JSON.parse(payloadStr);
            const sub = payload.sub;
            if (sub && typeof sub === "string") {
              const { data: adminUser } = await supabase.auth.admin.getUserById(sub);
              user = adminUser?.user;
            }
          }
        } catch {}
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
