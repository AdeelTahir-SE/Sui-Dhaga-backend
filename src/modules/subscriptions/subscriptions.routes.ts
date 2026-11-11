import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as subscriptionsController from "./subscriptions.controller.js";
import { subscriptionCheckoutSchema } from "./subscriptions.validator.js";

export const subscriptionsRoutes = Router();

/**
 * @openapi
 * /subscriptions/plans:
 *   get:
 *     summary: List available platform subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Subscription plans fetched successfully
 * /subscriptions/me:
 *   get:
 *     summary: Get current user's active subscription
 *     tags: [Subscriptions]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Active subscription details
 * /subscriptions/checkout:
 *   post:
 *     summary: Start checkout or activate a subscription plan
 *     tags: [Subscriptions]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId: { type: string }
 *               planSlug: { type: string, example: "atelier-plus" }
 *               billingCycle: { type: string, enum: [monthly, yearly], default: "monthly" }
 *               provider: { type: string, enum: [stripe, safepay, jazzcash, easypaisa, sadapay, nayapay] }
 *     responses:
 *       201:
 *         description: Subscription activated / checkout URL generated
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel current active subscription at period end
 *     tags: [Subscriptions]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Subscription cancelled
 */
subscriptionsRoutes.get("/subscriptions/plans", asyncHandler(subscriptionsController.getPlans));
subscriptionsRoutes.get("/subscriptions/me", requireAuth, asyncHandler(subscriptionsController.getMySubscription));
subscriptionsRoutes.post(
  "/subscriptions/checkout",
  requireAuth,
  validate(subscriptionCheckoutSchema),
  asyncHandler(subscriptionsController.checkoutSubscription)
);
subscriptionsRoutes.post(
  "/subscriptions/cancel",
  requireAuth,
  asyncHandler(subscriptionsController.cancelSubscription)
);
