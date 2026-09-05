import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as paymentsController from "./payments.controller.js";
import { createCheckoutSchema, confirmPaymentSchema } from "./payments.validator.js";

export const paymentsRoutes = Router();

/**
 * @openapi
 * /payments/create-checkout:
 *   post:
 *     summary: Create checkout session for order
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, amount, provider]
 *             properties:
 *               orderId:
 *                 type: string
 *               amount:
 *                 type: number
 *               provider:
 *                 type: string
 *                 enum: [stripe, safepay]
 *               currency:
 *                 type: string
 *                 default: PKR
 *     responses:
 *       201:
 *         description: Checkout session created successfully
 */
paymentsRoutes.post("/payments/create-checkout", requireAuth, requireRole("customer", "admin"), validate(createCheckoutSchema), asyncHandler(paymentsController.createCheckout));

/**
 * @openapi
 * /payments/confirm:
 *   post:
 *     summary: Confirm payment completion
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentId, transactionId, provider]
 *             properties:
 *               paymentId:
 *                 type: string
 *               transactionId:
 *                 type: string
 *               provider:
 *                 type: string
 *                 enum: [stripe, safepay]
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 */
paymentsRoutes.post("/payments/confirm", requireAuth, requireRole("customer", "admin"), validate(confirmPaymentSchema), asyncHandler(paymentsController.confirmPayment));

/**
 * @openapi
 * /payments/history:
 *   get:
 *     summary: Get payment history for authenticated user
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 */
paymentsRoutes.get("/payments/history", requireAuth, asyncHandler(paymentsController.getPaymentHistory));

/**
 * @openapi
 * /payments/{paymentId}:
 *   get:
 *     summary: Get payment details by ID
 *     tags: [Payments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment details retrieved successfully
 *       404:
 *         description: Payment not found
 */
paymentsRoutes.get("/payments/:paymentId", requireAuth, asyncHandler(paymentsController.getPaymentById));

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
