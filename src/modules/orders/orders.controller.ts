import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { ordersService } from "./orders.service.js";

export const getOrders: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await ordersService.getOrders(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Orders fetched successfully");
};

export const createOrder: RequestHandler = async (req, res) => {
  const created = await ordersService.createOrder(req.user?.id, req.userRole, req.body);
  success(res, created, "Order created successfully", 201);
};

export const getOrderById: RequestHandler = async (req, res) => {
  const order = await ordersService.getOrderById(asString(req.params.orderId), req.user?.id, req.userRole);
  success(res, order, "Order fetched successfully");
};

export const updateOrderStatus: RequestHandler = async (req, res) => {
  const updated = await ordersService.updateOrderStatus(
    asString(req.params.orderId),
    req.user?.id,
    req.userRole,
    req.body.status as string,
  );
  success(res, updated, "Order status updated successfully");
};

export const cancelOrder: RequestHandler = async (req, res) => {
  const cancelled = await ordersService.cancelOrder(asString(req.params.orderId), req.user?.id, req.userRole);
  success(res, cancelled, "Order cancelled successfully");
};

export const getOrderInvoice: RequestHandler = async (req, res) => {
  const invoice = await ordersService.getOrderInvoice(asString(req.params.orderId), req.user?.id, req.userRole);
  success(res, invoice, "Invoice generated successfully");
};

export const getOrderTracking: RequestHandler = async (req, res) => {
  const tracking = await ordersService.getOrderTracking(asString(req.params.orderId), req.user?.id, req.userRole);
  success(res, tracking, "Order tracking info fetched successfully");
};

export const addOrderTracking: RequestHandler = async (req, res) => {
  const created = await ordersService.addOrderTracking(asString(req.params.orderId), req.user?.id, req.userRole, req.body);
  success(res, created, "Tracking update added successfully", 201);
};

export const updateOrderTracking: RequestHandler = async (req, res) => {
  const updated = await ordersService.updateOrderTracking(asString(req.params.trackingId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Tracking entry updated successfully");
};
