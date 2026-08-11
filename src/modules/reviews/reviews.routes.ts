import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as reviewsController from "./reviews.controller.js";
import { createReviewSchema, updateReviewSchema } from "./reviews.validator.js";

export const reviewsRoutes = Router();

reviewsRoutes.get("/tailors/:tailorId/reviews", asyncHandler(reviewsController.getTailorReviews));
reviewsRoutes.post("/orders/:orderId/review", requireAuth, validate(createReviewSchema), asyncHandler(reviewsController.createOrderReview));
reviewsRoutes.patch("/reviews/:reviewId", requireAuth, validate(updateReviewSchema), asyncHandler(reviewsController.updateReview));
reviewsRoutes.delete("/reviews/:reviewId", requireAuth, asyncHandler(reviewsController.deleteReview));
