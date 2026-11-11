import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { paymentMethodsService } from "./payment-methods.service.js";

export const getMyPaymentMethods: RequestHandler = async (req, res) => {
  const methods = await paymentMethodsService.getMyPaymentMethods(req.user!.id);
  success(res, methods, "Payment methods fetched successfully");
};

export const createPaymentMethod: RequestHandler = async (req, res) => {
  const created = await paymentMethodsService.createPaymentMethod(req.user!.id, req.body);
  success(res, created, "Payment method saved successfully", 201);
};

export const updatePaymentMethod: RequestHandler = async (req, res) => {
  const updated = await paymentMethodsService.updatePaymentMethod(
    asString(req.params.methodId),
    req.user!.id,
    req.userRole,
    req.body
  );
  success(res, updated, "Payment method updated successfully");
};

export const deletePaymentMethod: RequestHandler = async (req, res) => {
  await paymentMethodsService.deletePaymentMethod(
    asString(req.params.methodId),
    req.user!.id,
    req.userRole
  );
  success(res, null, "Payment method deleted successfully");
};
