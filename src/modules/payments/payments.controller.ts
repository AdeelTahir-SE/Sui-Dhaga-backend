import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { paymentsService } from "./payments.service.js";

export const createCheckout: RequestHandler = async (req, res) => {
  const result = await paymentsService.createCheckout(req.user?.id, req.userRole, req.body);
  success(res, result, "Checkout session created", 201);
};

export const confirmPayment: RequestHandler = async (req, res) => {
  const result = await paymentsService.confirmPayment(req.user?.id, req.userRole, req.body);
  success(res, result, "Payment confirmed successfully");
};

export const getPaymentHistory: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await paymentsService.getPaymentHistory(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Payment history fetched successfully");
};

export const getPaymentById: RequestHandler = async (req, res) => {
  const payment = await paymentsService.getPaymentById(asString(req.params.paymentId), req.user?.id, req.userRole);
  success(res, payment, "Payment fetched successfully");
};

export const handleWebhook: RequestHandler = async (req, res) => {
  const result = await paymentsService.handleWebhook(req.body);
  success(res, result, "Webhook processed successfully");
};
