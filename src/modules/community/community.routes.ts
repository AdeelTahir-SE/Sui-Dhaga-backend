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

communityRoutes.get("/community/posts", asyncHandler(communityController.getPosts));
communityRoutes.post("/community/posts", requireAuth, validate(createCommunityPostSchema), asyncHandler(communityController.createPost));
communityRoutes.get("/community/posts/:postId", asyncHandler(communityController.getPostById));
communityRoutes.patch("/community/posts/:postId", requireAuth, validate(updateCommunityPostSchema), asyncHandler(communityController.updatePost));
communityRoutes.delete("/community/posts/:postId", requireAuth, asyncHandler(communityController.deletePost));

communityRoutes.post("/community/posts/:postId/like", requireAuth, asyncHandler(communityController.toggleLike));
communityRoutes.post("/community/posts/:postId/save", requireAuth, asyncHandler(communityController.toggleSave));
communityRoutes.get("/community/posts/:postId/comments", asyncHandler(communityController.getComments));
communityRoutes.post("/community/posts/:postId/comments", requireAuth, validate(addCommunityCommentSchema), asyncHandler(communityController.addComment));
