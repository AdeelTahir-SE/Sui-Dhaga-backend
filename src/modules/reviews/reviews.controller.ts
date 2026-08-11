import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { reviewsService } from "./reviews.service.js";

export const getTailorReviews: RequestHandler = async (req, res) => {
  const reviews = await reviewsService.getTailorReviews(asString(req.params.tailorId));
  success(res, reviews, "Reviews fetched successfully");
};

export const createOrderReview: RequestHandler = async (req, res) => {
  const created = await reviewsService.createOrderReview(asString(req.params.orderId), req.user?.id, req.userRole, req.body);
  success(res, created, "Review submitted successfully", 201);
};

export const updateReview: RequestHandler = async (req, res) => {
  const updated = await reviewsService.updateReview(asString(req.params.reviewId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Review updated successfully");
};

export const deleteReview: RequestHandler = async (req, res) => {
  await reviewsService.deleteReview(asString(req.params.reviewId), req.user?.id, req.userRole);
  success(res, null, "Review deleted successfully");
};
