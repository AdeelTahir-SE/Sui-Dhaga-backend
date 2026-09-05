import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as reviewsController from "./reviews.controller.js";
import { createReviewSchema, updateReviewSchema } from "./reviews.validator.js";

export const reviewsRoutes = Router();

/**
 * @openapi
 * /tailors/{tailorId}/reviews:
 *   get:
 *     summary: Get reviews for a tailor
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of reviews retrieved successfully
 */
reviewsRoutes.get("/tailors/:tailorId/reviews", asyncHandler(reviewsController.getTailorReviews));

/**
 * @openapi
 * /orders/{orderId}/review:
 *   post:
 *     summary: Leave a review for an order
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Review submitted successfully
 */
reviewsRoutes.post("/orders/:orderId/review", requireAuth, validate(createReviewSchema), asyncHandler(reviewsController.createOrderReview));

/**
 * @openapi
 * /reviews/{reviewId}:
 *   patch:
 *     summary: Update an existing review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
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
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Review deleted successfully
 */
reviewsRoutes.patch("/reviews/:reviewId", requireAuth, validate(updateReviewSchema), asyncHandler(reviewsController.updateReview));
reviewsRoutes.delete("/reviews/:reviewId", requireAuth, asyncHandler(reviewsController.deleteReview));
