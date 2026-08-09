import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { reviewsService } from "./reviews.service.js";

export const reviewsRoutes = Router();

reviewsRoutes.post(
  "/orders/:orderId/review",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await reviewsService.createOrderReview(asString(req.params.orderId), req.user?.id, req.userRole, req.body);
    success(res, created, "Review submitted successfully", 201);
  }),
);

reviewsRoutes.patch(
  "/reviews/:reviewId",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await reviewsService.updateReview(asString(req.params.reviewId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Review updated successfully");
  }),
);

reviewsRoutes.delete(
  "/reviews/:reviewId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await reviewsService.deleteReview(asString(req.params.reviewId), req.user?.id, req.userRole);
    success(res, null, "Review deleted successfully");
  }),
);
