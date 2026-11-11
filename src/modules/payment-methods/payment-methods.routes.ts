import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as paymentMethodsController from "./payment-methods.controller.js";
import {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
} from "./payment-methods.validator.js";

export const paymentMethodsRoutes = Router();

/**
 * @openapi
 * /payment-methods:
 *   get:
 *     summary: List saved payment methods (cards and local wallets) for authenticated user
 *     tags: [Payment Methods]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Saved payment methods list
 *   post:
 *     summary: Add a saved card or mobile wallet (last4/tokenized metadata only)
 *     tags: [Payment Methods]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [card, jazzcash, easypaisa, sadapay, nayapay, bank_transfer] }
 *               brand: { type: string, example: "Visa" }
 *               last4: { type: string, example: "4242" }
 *               expiryMonth: { type: integer }
 *               expiryYear: { type: integer }
 *               phone: { type: string }
 *               holderName: { type: string }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Payment method saved
 * /payment-methods/{methodId}:
 *   patch:
 *     summary: Update a saved payment method
 *     tags: [Payment Methods]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment method updated
 *   delete:
 *     summary: Delete a saved payment method
 *     tags: [Payment Methods]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment method deleted
 */
paymentMethodsRoutes.get(
  "/payment-methods",
  requireAuth,
  asyncHandler(paymentMethodsController.getMyPaymentMethods)
);
paymentMethodsRoutes.post(
  "/payment-methods",
  requireAuth,
  validate(createPaymentMethodSchema),
  asyncHandler(paymentMethodsController.createPaymentMethod)
);
paymentMethodsRoutes.patch(
  "/payment-methods/:methodId",
  requireAuth,
  validate(updatePaymentMethodSchema),
  asyncHandler(paymentMethodsController.updatePaymentMethod)
);
paymentMethodsRoutes.put(
  "/payment-methods/:methodId",
  requireAuth,
  validate(updatePaymentMethodSchema),
  asyncHandler(paymentMethodsController.updatePaymentMethod)
);
paymentMethodsRoutes.delete(
  "/payment-methods/:methodId",
  requireAuth,
  asyncHandler(paymentMethodsController.deletePaymentMethod)
);
