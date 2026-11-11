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
 *     summary: Get current user's active subscription (defaults to normal free plan)
 *     tags: [Subscriptions]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Active subscription details
 * /subscriptions/checkout:
 *   post:
 *     summary: Directly activate a subscription plan in the database
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
 *               planSlug: { type: string, example: "customer-plus" }
 *               billingCycle: { type: string, enum: [monthly, yearly], default: "monthly" }
 *               provider: { type: string, enum: [stripe, safepay, jazzcash, easypaisa, sadapay, nayapay, free, direct, manual] }
 *     responses:
 *       201:
 *         description: Subscription activated successfully
 * /subscriptions/activate:
 *   post:
 *     summary: Directly activate a subscription plan (alias of /subscriptions/checkout)
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
 *               planSlug: { type: string, example: "customer-plus" }
 *               billingCycle: { type: string, enum: [monthly, yearly], default: "monthly" }
 *               provider: { type: string, enum: [stripe, safepay, jazzcash, easypaisa, sadapay, nayapay, free, direct, manual] }
 *     responses:
 *       201:
 *         description: Subscription activated successfully
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel current active paid subscription at period end
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
  "/subscriptions/activate",
  requireAuth,
  validate(subscriptionCheckoutSchema),
  asyncHandler(subscriptionsController.checkoutSubscription)
);
subscriptionsRoutes.post(
  "/subscriptions/cancel",
  requireAuth,
  asyncHandler(subscriptionsController.cancelSubscription)
);
