import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { usersService } from "./users.service.js";

export const getMyProfile: RequestHandler = async (req, res) => {
  const profile = await usersService.getMyProfile(req.user!.id, req.userRole);
  success(res, profile, "Profile fetched successfully");
};

export const updateMyProfile: RequestHandler = async (req, res) => {
  const updated = await usersService.updateMyProfile(req.user!.id, req.userRole, req.body);
  success(res, updated, "Profile updated successfully");
};

export const updateAvatar: RequestHandler = async (req, res) => {
  const updated = await usersService.updateAvatar(req.user!.id, req.userRole, req.body.avatarUrl);
  success(res, updated, "Avatar updated successfully");
};

export const deleteMyProfile: RequestHandler = async (req, res) => {
  await usersService.deleteMyProfile(req.user!.id, req.userRole);
  success(res, null, "Profile deleted successfully");
};

export const getUserById: RequestHandler = async (req, res) => {
  const user = await usersService.getUserById(asString(req.params.userId), req.user?.id, req.userRole);
  success(res, user, "User fetched successfully");
};
