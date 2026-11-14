import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadAvatarFlexible } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as usersController from "./users.controller.js";
import {
  updateProfileSchema,
  updateAvatarSchema,
  reportUserSchema,
  blockUserSchema,
} from "./users.validator.js";

export const usersRoutes = Router();

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Retrieve profile of currently authenticated user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profile details retrieved
 *   patch:
 *     summary: Update profile details and optional profile image for current user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Ayesha Khan" }
 *               fullName: { type: string, example: "Ayesha Khan" }
 *               phone: { type: string, example: "+923001234567" }
 *               address: { type: string, example: "Gulberg III, Lahore" }
 *               bio: { type: string, example: "Fashion enthusiast" }
 *               avatarUrl: { type: string, nullable: true, description: "Image URL or base64 data URI; pass null or empty string to remove" }
 *               removeAvatar: { type: boolean }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary, description: "Optional profile image file (JPEG, PNG, WebP, GIF, SVG, AVIF, HEIC; max 5MB)" }
 *               fullName: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               bio: { type: string }
 *     responses:
 *       200:
 *         description: Profile successfully updated
 *   put:
 *     summary: Update profile details and optional profile image for current user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Ayesha Khan" }
 *               fullName: { type: string, example: "Ayesha Khan" }
 *               phone: { type: string, example: "+923001234567" }
 *               address: { type: string, example: "Gulberg III, Lahore" }
 *               bio: { type: string, example: "Fashion enthusiast" }
 *               avatarUrl: { type: string, nullable: true }
 *               removeAvatar: { type: boolean }
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *               fullName: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               bio: { type: string }
 *     responses:
 *       200:
 *         description: Profile successfully updated
 *   delete:
 *     summary: Delete currently authenticated user account and profile
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Account deleted successfully
 */
usersRoutes.get("/users/me", requireAuth, asyncHandler(usersController.getMyProfile));
usersRoutes.patch(
  "/users/me",
  requireAuth,
  uploadAvatarFlexible,
  validate(updateProfileSchema),
  asyncHandler(usersController.updateMyProfile)
);
usersRoutes.put(
  "/users/me",
  requireAuth,
  uploadAvatarFlexible,
  validate(updateProfileSchema),
  asyncHandler(usersController.updateMyProfile)
);
usersRoutes.delete(
  "/users/me",
  requireAuth,
  asyncHandler(usersController.deleteMyProfile)
);

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     summary: Upload profile avatar image (multipart file, base64 data URI, or URL) and update profile avatar_url
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file (JPEG, PNG, WebP, GIF, SVG, AVIF, HEIC; max 5MB; also accepts field names image, file, photo, picture, profileImage)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarUrl: { type: string, description: "Image URL or base64 data URI" }
 *               avatar: { type: string, description: "Base64 data URI or image URL" }
 *               image: { type: string, description: "Base64 data URI or image URL" }
 *     responses:
 *       200:
 *         description: Avatar uploaded and profile updated successfully
 *   put:
 *     summary: Upload or replace profile avatar image
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarUrl: { type: string }
 *     responses:
 *       200:
 *         description: Avatar uploaded and profile updated successfully
 *   patch:
 *     summary: Upload or update profile avatar image
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar: { type: string, format: binary }
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarUrl: { type: string }
 *     responses:
 *       200:
 *         description: Avatar uploaded and profile updated successfully
 *   delete:
 *     summary: Remove custom profile avatar image from storage and reset profile avatar_url
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Avatar removed successfully
 */
usersRoutes.post(
  "/users/me/avatar",
  requireAuth,
  uploadAvatarFlexible,
  validate(updateAvatarSchema),
  asyncHandler(usersController.updateAvatar)
);
usersRoutes.put(
  "/users/me/avatar",
  requireAuth,
  uploadAvatarFlexible,
  validate(updateAvatarSchema),
  asyncHandler(usersController.updateAvatar)
);
usersRoutes.patch(
  "/users/me/avatar",
  requireAuth,
  uploadAvatarFlexible,
  validate(updateAvatarSchema),
  asyncHandler(usersController.updateAvatar)
);
usersRoutes.delete("/users/me/avatar", requireAuth, asyncHandler(usersController.deleteAvatar));

/**
 * @openapi
 * /users/blocked:
 *   get:
 *     summary: List users blocked by authenticated user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Blocked users list retrieved successfully
 * /users/report:
 *   post:
 *     summary: Report a user for inappropriate behavior
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetId: { type: string }
 *               reason: { type: string }
 *               details: { type: string }
 *     responses:
 *       200:
 *         description: Report submitted successfully
 * /users/block:
 *   post:
 *     summary: Block another user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetId: { type: string }
 *     responses:
 *       200:
 *         description: User blocked successfully
 * /users/unblock:
 *   post:
 *     summary: Unblock a previously blocked user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetId: { type: string }
 *     responses:
 *       200:
 *         description: User unblocked successfully
 * /users/{userId}/block-status:
 *   get:
 *     summary: Check whether a user is blocked by the authenticated user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Block status returned
 * /users/{userId}/follow-status:
 *   get:
 *     summary: Check whether authenticated user follows the target user
 *     tags: [Community]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Follow status returned
 */
// Specific endpoints MUST precede the parametrized :userId route
usersRoutes.get("/users/blocked", requireAuth, asyncHandler(usersController.getBlockedUsers));
usersRoutes.post("/users/report", requireAuth, validate(reportUserSchema), asyncHandler(usersController.reportUser));
usersRoutes.post("/users/block", requireAuth, validate(blockUserSchema), asyncHandler(usersController.blockUser));
usersRoutes.post("/users/unblock", requireAuth, asyncHandler(usersController.unblockUser));
usersRoutes.get("/users/:userId/block-status", requireAuth, asyncHandler(usersController.getBlockStatus));

/**
 * @openapi
 * /users/{userId}/follow:
 *   post:
 *     summary: Follow a creator or tailor
 *     tags: [Community]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Followed successfully
 *   delete:
 *     summary: Unfollow a creator or tailor
 *     tags: [Community]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Unfollowed successfully
 */
usersRoutes.get("/users/:userId/follow-status", requireAuth, asyncHandler(usersController.getFollowStatus));
usersRoutes.post("/users/:userId/follow", requireAuth, asyncHandler(usersController.followUser));
usersRoutes.delete("/users/:userId/follow", requireAuth, asyncHandler(usersController.unfollowUser));

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get public profile information of another user
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Target user ID
 *     responses:
 *       200:
 *         description: User public profile details
 */
usersRoutes.get("/users/:userId", requireAuth, asyncHandler(usersController.getUserById));
