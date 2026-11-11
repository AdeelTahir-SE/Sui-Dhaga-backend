import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as paymentsController from "./payments.controller.js";
import { confirmPaymentSchema, createCheckoutSchema } from "./payments.validator.js";

export const paymentsRoutes = Router();

/**
 * @openapi
 * /payments/transactions:
 *   get:
 *     summary: Get paginated payment transaction history for authenticated user
 *     tags: [Payments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 * /payments/history:
 *   get:
 *     summary: Get paginated payment transaction history (alias of /payments/transactions)
 *     tags: [Payments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Transaction history retrieved successfully
 */
paymentsRoutes.get("/payments/transactions", requireAuth, asyncHandler(paymentsController.getPaymentHistory));
paymentsRoutes.get("/payments/history", requireAuth, asyncHandler(paymentsController.getPaymentHistory));

/**
 * @openapi
 * /payments/checkout:
 *   post:
 *     summary: Create checkout session for an order (Stripe, Safepay, JazzCash, EasyPaisa, SadaPay, COD)
 *     tags: [Payments]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string, format: uuid }
 *               amount: { type: number }
 *               provider: { type: string, enum: [stripe, safepay, jazzcash, easypaisa, sadapay, nayapay, cod] }
 *               currency: { type: string, default: "PKR" }
 *               couponCode: { type: string }
 *     responses:
 *       201:
 *         description: Checkout session created successfully
 * /payments/create-checkout:
 *   post:
 *     summary: Create checkout session for an order (alias of /payments/checkout)
 *     tags: [Payments]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId: { type: string, format: uuid }
 *               amount: { type: number }
 *               provider: { type: string, enum: [stripe, safepay, jazzcash, easypaisa, sadapay, nayapay, cod] }
 *               currency: { type: string, default: "PKR" }
 *               couponCode: { type: string }
 *     responses:
 *       201:
 *         description: Checkout session created successfully
 * /payments/confirm:
 *   post:
 *     summary: Confirm a completed payment transaction
 *     tags: [Payments]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, transactionId]
 *             properties:
 *               paymentId: { type: string }
 *               transactionId: { type: string }
 *               provider: { type: string }
 *     responses:
 *       200:
 *         description: Payment confirmed and order updated
 */
paymentsRoutes.post(
  "/payments/checkout",
  requireAuth,
  validate(createCheckoutSchema),
  asyncHandler(paymentsController.createCheckout)
);
paymentsRoutes.post(
  "/payments/create-checkout",
  requireAuth,
  validate(createCheckoutSchema),
  asyncHandler(paymentsController.createCheckout)
);
paymentsRoutes.post(
  "/payments/confirm",
  requireAuth,
  validate(confirmPaymentSchema),
  asyncHandler(paymentsController.confirmPayment)
);

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Webhook handler for payment providers
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received and processed
 */
paymentsRoutes.post("/payments/webhook", asyncHandler(paymentsController.handleWebhook));

/**
 * @openapi
 * /payments/{paymentId}:
 *   get:
 *     summary: Get single payment transaction details by ID
 *     tags: [Payments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment fetched successfully
 */
paymentsRoutes.get("/payments/:paymentId", requireAuth, asyncHandler(paymentsController.getPaymentById));
