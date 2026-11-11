import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { couponsService } from "./coupons.service.js";

export const validateCoupon: RequestHandler = async (req, res) => {
  const orderAmount = Number(req.body.orderAmount ?? req.body.amount ?? 0);
  const result = await couponsService.validateCoupon({
    code: String(req.body.code || ""),
    orderAmount,
    userId: req.user?.id,
  });
  success(res, result, "Coupon applied successfully");
};
