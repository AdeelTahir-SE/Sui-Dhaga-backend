import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import * as paymentsController from "./payments.controller.js";

export const paymentsRoutes = Router();



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
