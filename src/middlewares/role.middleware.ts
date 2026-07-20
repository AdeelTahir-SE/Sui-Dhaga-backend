import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const requireRole = (...roles: Array<"customer" | "tailor" | "admin">): RequestHandler => (req, _res, next) =>
  !req.userRole || !roles.includes(req.userRole) ? next(new AppError("Insufficient permissions", 403)) : next();
