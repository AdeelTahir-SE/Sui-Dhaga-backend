import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { paymentsService } from "./payments.service.js";

export const paymentsRoutes = Router();

const paymentAuth = [requireAuth, requireRole("customer", "admin")];

paymentsRoutes.post(
  "/payments/create-checkout",
  ...paymentAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const checkout = await paymentsService.createCheckout(req.user?.id, req.userRole, req.body);
    success(res, checkout, "Checkout session created successfully", 201);
  }),
);

paymentsRoutes.post(
  "/payments/confirm",
  ...paymentAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const payment = await paymentsService.confirmPayment(req.user?.id, req.userRole, req.body);
    success(res, payment, "Payment confirmed successfully");
  }),
);

paymentsRoutes.get(
  "/payments/history",
  ...paymentAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await paymentsService.getPaymentHistory(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Payment history fetched successfully");
  }),
);

paymentsRoutes.get(
  "/payments/:paymentId",
  ...paymentAuth,
  asyncHandler(async (req, res) => {
    const payment = await paymentsService.getPaymentById(asString(req.params.paymentId), req.user?.id, req.userRole);
    success(res, payment, "Payment details fetched successfully");
  }),
);

paymentsRoutes.post(
  "/payments/webhook",
  asyncHandler(async (req, res) => {
    await paymentsService.handleWebhook(req.body);
    success(res, { received: true }, "Webhook processed successfully");
  }),
);
