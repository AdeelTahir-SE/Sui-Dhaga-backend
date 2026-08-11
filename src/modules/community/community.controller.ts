import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { communityService } from "./community.service.js";

export const getPosts: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await communityService.getPosts(page, limit);
  paginated(res, result.records, page, limit, result.total, "Community posts fetched successfully");
};

export const createPost: RequestHandler = async (req, res) => {
  const created = await communityService.createPost(req.user?.id, req.userRole, req.body);
  success(res, created, "Community post created successfully", 201);
};

export const getPostById: RequestHandler = async (req, res) => {
  const post = await communityService.getPostById(asString(req.params.postId));
  success(res, post, "Community post fetched successfully");
};

export const updatePost: RequestHandler = async (req, res) => {
  const updated = await communityService.updatePost(asString(req.params.postId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Community post updated successfully");
};

export const deletePost: RequestHandler = async (req, res) => {
  await communityService.deletePost(asString(req.params.postId), req.user?.id, req.userRole);
  success(res, null, "Community post deleted successfully");
};

export const toggleLike: RequestHandler = async (req, res) => {
  const updated = await communityService.toggleLike(asString(req.params.postId), req.user?.id, req.userRole);
  success(res, updated, "Like toggled successfully");
};

export const toggleSave: RequestHandler = async (req, res) => {
  const updated = await communityService.toggleSave(asString(req.params.postId), req.user?.id, req.userRole);
  success(res, updated, "Save status toggled successfully");
};

export const getComments: RequestHandler = async (req, res) => {
  const post = await communityService.getPostById(asString(req.params.postId));
  success(res, post ? (post as Record<string, unknown>).comments ?? [] : [], "Post comments fetched successfully");
};

export const addComment: RequestHandler = async (req, res) => {
  const comment = await communityService.addComment(asString(req.params.postId), req.user?.id, req.userRole, req.body);
  success(res, comment, "Comment added successfully", 201);
};
