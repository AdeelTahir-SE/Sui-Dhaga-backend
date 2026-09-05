import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as communityController from "./community.controller.js";
import {
  createCommunityPostSchema,
  updateCommunityPostSchema,
  addCommunityCommentSchema,
} from "./community.validator.js";

export const communityRoutes = Router();

/**
 * @openapi
 * /community/posts:
 *   get:
 *     summary: List community posts
 *     tags: [Community]
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of posts retrieved successfully
 *   post:
 *     summary: Create a new community post
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Post created successfully
 */
communityRoutes.get("/community/posts", asyncHandler(communityController.getPosts));
communityRoutes.post("/community/posts", requireAuth, validate(createCommunityPostSchema), asyncHandler(communityController.createPost));

/**
 * @openapi
 * /community/posts/{postId}:
 *   get:
 *     summary: Get community post by ID
 *     tags: [Community]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post details retrieved successfully
 *       404:
 *         description: Post not found
 *   patch:
 *     summary: Update a community post
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Post updated successfully
 *   delete:
 *     summary: Delete a community post
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted successfully
 */
communityRoutes.get("/community/posts/:postId", asyncHandler(communityController.getPostById));
communityRoutes.patch("/community/posts/:postId", requireAuth, validate(updateCommunityPostSchema), asyncHandler(communityController.updatePost));
communityRoutes.delete("/community/posts/:postId", requireAuth, asyncHandler(communityController.deletePost));

/**
 * @openapi
 * /community/posts/{postId}/like:
 *   post:
 *     summary: Toggle like on a community post
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post like status toggled successfully
 */
communityRoutes.post("/community/posts/:postId/like", requireAuth, asyncHandler(communityController.toggleLike));

/**
 * @openapi
 * /community/posts/{postId}/save:
 *   post:
 *     summary: Toggle save / bookmark on a community post
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post save status toggled successfully
 */
communityRoutes.post("/community/posts/:postId/save", requireAuth, asyncHandler(communityController.toggleSave));

/**
 * @openapi
 * /community/posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a community post
 *     tags: [Community]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of comments retrieved successfully
 *   post:
 *     summary: Add a comment to a community post
 *     tags: [Community]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
communityRoutes.get("/community/posts/:postId/comments", asyncHandler(communityController.getComments));
communityRoutes.post("/community/posts/:postId/comments", requireAuth, validate(addCommunityCommentSchema), asyncHandler(communityController.addComment));
