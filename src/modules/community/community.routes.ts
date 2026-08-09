import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { communityService } from "./community.service.js";

export const communityRoutes = Router();

communityRoutes.get(
  "/community/posts",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await communityService.getPosts(page, limit);
    paginated(res, result.records, page, limit, result.total, "Community posts fetched successfully");
  }),
);

communityRoutes.get(
  "/community/posts/:postId",
  asyncHandler(async (req, res) => {
    const post = await communityService.getPostById(asString(req.params.postId));
    success(res, post, "Community post fetched successfully");
  }),
);

communityRoutes.post(
  "/community/posts",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await communityService.createPost(req.user?.id, req.userRole, req.body);
    success(res, created, "Community post created successfully", 201);
  }),
);

communityRoutes.patch(
  "/community/posts/:postId",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await communityService.updatePost(asString(req.params.postId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Community post updated successfully");
  }),
);

communityRoutes.delete(
  "/community/posts/:postId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await communityService.deletePost(asString(req.params.postId), req.user?.id, req.userRole);
    success(res, null, "Community post deleted successfully");
  }),
);

communityRoutes.post(
  "/community/posts/:postId/like",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await communityService.toggleLike(asString(req.params.postId), req.user?.id, req.userRole);
    success(res, updated, "Post like toggled successfully");
  }),
);

communityRoutes.post(
  "/community/posts/:postId/save",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await communityService.toggleSave(asString(req.params.postId), req.user?.id, req.userRole);
    success(res, updated, "Post save toggled successfully");
  }),
);

communityRoutes.get(
  "/community/posts/:postId/comments",
  asyncHandler(async (req, res) => {
    const comments = await communityService.getComments(asString(req.params.postId));
    success(res, comments, "Comments fetched successfully");
  }),
);

communityRoutes.post(
  "/community/posts/:postId/comments",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const comment = await communityService.addComment(asString(req.params.postId), req.user?.id, req.userRole, req.body);
    success(res, comment, "Comment added successfully", 201);
  }),
);
