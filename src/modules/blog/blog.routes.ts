import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as blogController from "./blog.controller.js";
import { createBlogPostSchema, updateBlogPostSchema } from "./blog.validator.js";

export const blogRoutes = Router();

/**
 * @openapi
 * /blog:
 *   get:
 *     summary: List published editorial and tailoring guide blog articles
 *     tags: [Blog]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blog articles fetched successfully
 *   post:
 *     summary: Create a blog article (Admin only)
 *     tags: [Blog]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Blog article created
 * /blog/{slug}:
 *   get:
 *     summary: Read a single blog article by slug or ID
 *     tags: [Blog]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blog article retrieved
 *   patch:
 *     summary: Update a blog article by slug or ID (Admin only)
 *     tags: [Blog]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               excerpt: { type: string }
 *               content: { type: string }
 *               category: { type: string }
 *               tags: { type: array, items: { type: string } }
 *               coverImageUrl: { type: string, format: uri }
 *               isPublished: { type: boolean }
 *     responses:
 *       200:
 *         description: Blog article updated
 *   delete:
 *     summary: Delete a blog article by slug or ID (Admin only)
 *     tags: [Blog]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blog article deleted
 */
blogRoutes.get("/blog", asyncHandler(blogController.listPosts));
blogRoutes.get("/blog/:slug", asyncHandler(blogController.getPostBySlug));
blogRoutes.post(
  "/blog",
  requireAuth,
  requireRole("admin"),
  validate(createBlogPostSchema),
  asyncHandler(blogController.createPost)
);
blogRoutes.patch(
  "/blog/:slug",
  requireAuth,
  requireRole("admin"),
  validate(updateBlogPostSchema),
  asyncHandler(blogController.updatePost)
);
blogRoutes.delete("/blog/:slug", requireAuth, requireRole("admin"), asyncHandler(blogController.deletePost));
