import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { usersService } from "./users.service.js";

export const usersRoutes = Router();

usersRoutes.get(
  "/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await usersService.getMyProfile(req.user!.id, req.userRole);
    success(res, profile, "Profile fetched successfully");
  }),
);

usersRoutes.patch(
  "/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await usersService.updateMyProfile(req.user!.id, req.userRole, req.body);
    success(res, updated, "Profile updated successfully");
  }),
);

usersRoutes.patch(
  "/users/me/avatar",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await usersService.updateAvatar(req.user!.id, req.userRole, req.body.avatarUrl);
    success(res, updated, "Avatar updated successfully");
  }),
);

usersRoutes.delete(
  "/users/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    await usersService.deleteMyProfile(req.user!.id, req.userRole);
    success(res, null, "Profile deleted successfully");
  }),
);

usersRoutes.get(
  "/users/:userId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await usersService.getUserById(asString(req.params.userId), req.user?.id, req.userRole);
    success(res, user, "User fetched successfully");
  }),
);
