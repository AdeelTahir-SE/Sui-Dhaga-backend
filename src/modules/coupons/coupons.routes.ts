import { Router } from "express";
import { optionalAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as couponsController from "./coupons.controller.js";
import { validateCouponSchema } from "./coupons.validator.js";

export const couponsRoutes = Router();

/**
 * @openapi
 * /coupons/validate:
 *   post:
 *     summary: Validate a promo or discount coupon for an order amount
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: "SUI10" }
 *               orderAmount: { type: number, example: 10000 }
 *     responses:
 *       200:
 *         description: Coupon validated with calculated discount
 *       400:
 *         description: Invalid or ineligible coupon
 */
couponsRoutes.post(
  "/coupons/validate",
  optionalAuth,
  validate(validateCouponSchema),
  asyncHandler(couponsController.validateCoupon)
);
