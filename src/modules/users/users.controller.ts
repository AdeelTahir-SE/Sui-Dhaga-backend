import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { usersService } from "./users.service.js";

export const getMyProfile: RequestHandler = async (req, res) => {
  const profile = await usersService.getMyProfile(req.user!.id, req.userRole, req.user?.email);
  success(res, profile, "Profile fetched successfully");
};

export const updateMyProfile: RequestHandler = async (req, res) => {
  const updated = await usersService.updateMyProfile(
    req.user!.id,
    req.userRole,
    req.body,
    req.file
  );
  success(res, updated, "Profile updated successfully");
};

export const updateAvatar: RequestHandler = async (req, res) => {
  const updated = await usersService.updateAvatar(
    req.user!.id,
    req.userRole,
    req.file,
    req.body
  );
  success(res, updated, "Avatar updated successfully");
};

export const deleteAvatar: RequestHandler = async (req, res) => {
  const updated = await usersService.deleteAvatar(req.user!.id, req.userRole);
  success(res, updated, "Avatar removed successfully");
};

export const deleteMyProfile: RequestHandler = async (req, res) => {
  await usersService.deleteMyProfile(req.user!.id, req.userRole);
  success(res, null, "Profile deleted successfully");
};

export const getUserById: RequestHandler = async (req, res) => {
  const user = await usersService.getUserById(asString(req.params.userId), req.user?.id, req.userRole);
  success(res, user, "User fetched successfully");
};

export const reportUser: RequestHandler = async (req, res) => {
  const targetId =
    req.body.targetId ||
    req.body.target_id ||
    req.body.targetUserId ||
    req.body.target_user_id ||
    req.body.userId;
  const reason = req.body.reason || req.body.category || "Inappropriate behavior";
  const details = req.body.details || req.body.description || req.body.note;

  if (!targetId) {
    throw new AppError("Target user ID is required", 400);
  }

  const result = await usersService.reportUser(req.user!.id, String(targetId), String(reason), details);
  success(res, result, "Report submitted successfully");
};

export const blockUser: RequestHandler = async (req, res) => {
  const targetId =
    req.body.targetId ||
    req.body.target_id ||
    req.body.targetUserId ||
    req.body.target_user_id ||
    req.body.userId;

  if (!targetId) {
    throw new AppError("Target user ID is required", 400);
  }

  const result = await usersService.blockUser(req.user!.id, String(targetId));
  success(res, result, "User blocked successfully");
};

export const unblockUser: RequestHandler = async (req, res) => {
  const targetId =
    req.body.targetId ||
    req.body.target_id ||
    req.body.targetUserId ||
    req.body.target_user_id ||
    req.body.userId ||
    req.params.userId;

  if (!targetId) {
    throw new AppError("Target user ID is required", 400);
  }

  const result = await usersService.unblockUser(req.user!.id, String(targetId));
  success(res, result, "User unblocked successfully");
};

export const getBlockStatus: RequestHandler = async (req, res) => {
  const rawTarget =
    req.params.userId ||
    (typeof req.query.targetId === "string" ? req.query.targetId : undefined) ||
    (typeof req.query.target_id === "string" ? req.query.target_id : undefined) ||
    (typeof req.query.targetUserId === "string" ? req.query.targetUserId : undefined);

  const targetId = asString(rawTarget);

  const result = await usersService.checkBlockStatus(req.user!.id, targetId);
  success(res, result, "Block status fetched successfully");
};

export const followUser: RequestHandler = async (req, res) => {
  const result = await usersService.followUser(req.user!.id, asString(req.params.userId));
  success(res, result, "User followed successfully");
};

export const unfollowUser: RequestHandler = async (req, res) => {
  const result = await usersService.unfollowUser(req.user!.id, asString(req.params.userId));
  success(res, result, "User unfollowed successfully");
};

export const getFollowStatus: RequestHandler = async (req, res) => {
  const result = await usersService.getFollowStatus(req.user?.id, asString(req.params.userId));
  success(res, result, "Follow status fetched successfully");
};

export const getBlockedUsers: RequestHandler = async (req, res) => {
  const result = await usersService.getBlockedUsers(req.user!.id);
  success(res, result, "Blocked users fetched successfully");
};
