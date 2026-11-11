import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadAvatar } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as usersController from "./users.controller.js";
import {
  updateProfileSchema,
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
 *     summary: Update profile details for current user
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
 *               phone: { type: string, example: "+923001234567" }
 *               address: { type: string, example: "Gulberg III, Lahore" }
 *               bio: { type: string, example: "Fashion enthusiast" }
 *     responses:
 *       200:
 *         description: Profile successfully updated
 */
usersRoutes.get("/users/me", requireAuth, asyncHandler(usersController.getMyProfile));
usersRoutes.patch("/users/me", requireAuth, validate(updateProfileSchema), asyncHandler(usersController.updateMyProfile));

/**
 * @swagger
 * /users/me/avatar:
 *   post:
 *     summary: Upload profile avatar picture to storage and update profile avatar_url
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Avatar uploaded and profile updated successfully
 */
usersRoutes.post("/users/me/avatar", requireAuth, uploadAvatar.single("avatar"), asyncHandler(usersController.updateAvatar));

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
