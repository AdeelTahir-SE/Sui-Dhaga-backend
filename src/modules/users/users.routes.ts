import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadAvatar } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as usersController from "./users.controller.js";
import { updateProfileSchema } from "./users.validator.js";

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
 *   delete:
 *     summary: Soft delete / deactivate user profile
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 */
usersRoutes.get("/users/me", requireAuth, asyncHandler(usersController.getMyProfile));
usersRoutes.patch("/users/me", requireAuth, validate(updateProfileSchema), asyncHandler(usersController.updateMyProfile));
usersRoutes.delete("/users/me", requireAuth, asyncHandler(usersController.deleteMyProfile));

/**
 * @swagger
 * /users/me/avatar:
 *   patch:
 *     summary: Upload profile avatar picture to storage and update profile avatar_url
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, WebP, GIF)
 *     responses:
 *       200:
 *         description: Avatar uploaded and profile updated successfully
 *       400:
 *         description: Invalid file format or missing file
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Upload profile avatar picture to storage and update profile avatar_url
 *     tags: [Users]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: Avatar image file (JPEG, PNG, WebP, GIF)
 *     responses:
 *       200:
 *         description: Avatar uploaded and profile updated successfully
 *       400:
 *         description: Invalid file format or missing file
 *       401:
 *         description: Unauthorized
 */
usersRoutes.patch("/users/me/avatar", requireAuth, uploadAvatar.single("avatar"), asyncHandler(usersController.updateAvatar));
usersRoutes.post("/users/me/avatar", requireAuth, uploadAvatar.single("avatar"), asyncHandler(usersController.updateAvatar));

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

