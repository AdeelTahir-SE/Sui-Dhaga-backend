import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as paymentsController from "./payments.controller.js";
import { createCheckoutSchema, confirmPaymentSchema } from "./payments.validator.js";

export const paymentsRoutes = Router();

paymentsRoutes.post("/payments/create-checkout", requireAuth, requireRole("customer", "admin"), validate(createCheckoutSchema), asyncHandler(paymentsController.createCheckout));
paymentsRoutes.post("/payments/confirm", requireAuth, requireRole("customer", "admin"), validate(confirmPaymentSchema), asyncHandler(paymentsController.confirmPayment));
paymentsRoutes.get("/payments/history", requireAuth, asyncHandler(paymentsController.getPaymentHistory));
paymentsRoutes.get("/payments/:paymentId", requireAuth, asyncHandler(paymentsController.getPaymentById));
paymentsRoutes.post("/payments/webhook", asyncHandler(paymentsController.handleWebhook));
