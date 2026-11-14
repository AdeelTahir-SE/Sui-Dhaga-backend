import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as reviewsController from "./reviews.controller.js";
import { createReviewSchema, replyReviewSchema, updateReviewSchema } from "./reviews.validator.js";

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
 *   post:
 *     summary: Submit a direct review for a tailor
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
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
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               comment: { type: string, example: "Excellent stitching and timely delivery." }
 *               images: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Tailor review submitted successfully
 */
reviewsRoutes.get("/tailors/:tailorId/reviews", asyncHandler(reviewsController.getTailorReviews));
reviewsRoutes.post(
  "/tailors/:tailorId/reviews",
  requireAuth,
  validate(createReviewSchema),
  asyncHandler(reviewsController.createTailorReview)
);
reviewsRoutes.get("/orders/:orderId/review", requireAuth, asyncHandler(reviewsController.getOrderReview));

/**
 * @openapi
 * /orders/{orderId}/review:
 *   get:
 *     summary: Get the review submitted for a specific order
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order review fetched successfully
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
 * /reviews/{reviewId}/reply:
 *   post:
 *     summary: Tailor replies to a customer review
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
 *               reply: { type: string }
 *               tailorReply: { type: string }
 *     responses:
 *       200:
 *         description: Reply saved successfully
 * /reviews/{reviewId}:
 *   patch:
 *     summary: Update an existing customer review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review updated successfully
 *   delete:
 *     summary: Delete a customer review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review deleted successfully
 */
reviewsRoutes.post(
  "/reviews/:reviewId/reply",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(replyReviewSchema),
  asyncHandler(reviewsController.replyToReview)
);
/**
 * @openapi
 * /tailors/{tailorId}/reviews/{reviewId}/reply:
 *   post:
 *     summary: Tailor replies to a customer review under a specific tailor context
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reply: { type: string }
 *               tailorReply: { type: string }
 *     responses:
 *       200:
 *         description: Reply saved successfully
 */
reviewsRoutes.post(
  "/tailors/:tailorId/reviews/:reviewId/reply",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(replyReviewSchema),
  asyncHandler(reviewsController.replyToReview)
);
reviewsRoutes.patch(
  "/reviews/:reviewId",
  requireAuth,
  validate(updateReviewSchema),
  asyncHandler(reviewsController.updateReview)
);
reviewsRoutes.delete("/reviews/:reviewId", requireAuth, asyncHandler(reviewsController.deleteReview));
