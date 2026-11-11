import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { blogService } from "./blog.service.js";

export const listPosts: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await blogService.listPosts({
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    tag: typeof req.query.tag === "string" ? req.query.tag : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    page,
    limit,
  });
  paginated(res, result.records, page, limit, result.total, "Blog posts fetched successfully");
};

export const getPostBySlug: RequestHandler = async (req, res) => {
  const post = await blogService.getPostBySlug(asString(req.params.slug));
  success(res, post, "Blog article fetched successfully");
};

export const createPost: RequestHandler = async (req, res) => {
  const created = await blogService.createPost(req.body);
  success(res, created, "Blog article created successfully", 201);
};

export const updatePost: RequestHandler = async (req, res) => {
  const updated = await blogService.updatePost(asString(req.params.slug), req.body);
  success(res, updated, "Blog article updated successfully");
};

export const deletePost: RequestHandler = async (req, res) => {
  await blogService.deletePost(asString(req.params.slug));
  success(res, null, "Blog article deleted successfully");
};
