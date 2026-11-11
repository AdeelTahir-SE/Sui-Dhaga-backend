import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { subscriptionsService } from "./subscriptions.service.js";

export const getPlans: RequestHandler = async (_req, res) => {
  const plans = await subscriptionsService.getPlans();
  success(res, plans, "Subscription plans fetched successfully");
};

export const getMySubscription: RequestHandler = async (req, res) => {
  const subscription = await subscriptionsService.getMySubscription(req.user!.id);
  success(res, subscription, "Active subscription fetched successfully");
};

export const checkoutSubscription: RequestHandler = async (req, res) => {
  const result = await subscriptionsService.checkoutSubscription(req.user!.id, req.body);
  success(res, result, "Subscription checkout processed successfully", 201);
};

export const cancelSubscription: RequestHandler = async (req, res) => {
  const updated = await subscriptionsService.cancelSubscription(req.user!.id);
  success(res, updated, "Subscription cancelled successfully");
};
