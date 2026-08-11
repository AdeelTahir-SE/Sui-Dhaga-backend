import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error.js";

export const requireOwnership = (ownerIdParamKey = "userId"): RequestHandler => (req, _res, next) => {
  if (req.userRole === "admin") return next();

  const resourceOwnerId = req.params[ownerIdParamKey] ?? req.body?.ownerId;
  if (!req.user || (resourceOwnerId && req.user.id !== resourceOwnerId)) {
    return next(new AppError("You do not have permission to access or modify this resource", 403));
  }

  next();
};
