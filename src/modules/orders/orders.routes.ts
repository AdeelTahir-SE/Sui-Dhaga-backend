import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { ordersService } from "./orders.service.js";

export const ordersRoutes = Router();

const orderAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

ordersRoutes.get(
  "/orders",
  ...orderAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await ordersService.getOrders(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Orders fetched successfully");
  }),
);

ordersRoutes.post(
  "/orders",
  ...orderAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await ordersService.createOrder(req.user?.id, req.userRole, req.body);
    success(res, created, "Order created successfully", 201);
  }),
);

ordersRoutes.get(
  "/orders/:orderId",
  ...orderAuth,
  asyncHandler(async (req, res) => {
    const order = await ordersService.getOrderById(asString(req.params.orderId), req.user?.id, req.userRole);
    success(res, order, "Order fetched successfully");
  }),
);

ordersRoutes.patch(
  "/orders/:orderId/status",
  ...orderAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await ordersService.updateOrderStatus(
      asString(req.params.orderId),
      req.user?.id,
      req.userRole,
      req.body.status as string,
    );
    success(res, updated, "Order status updated successfully");
  }),
);

ordersRoutes.post(
  "/orders/:orderId/cancel",
  ...orderAuth,
  asyncHandler(async (req, res) => {
    const cancelled = await ordersService.cancelOrder(asString(req.params.orderId), req.user?.id, req.userRole);
    success(res, cancelled, "Order cancelled successfully");
  }),
);

ordersRoutes.get(
  "/orders/:orderId/invoice",
  ...orderAuth,
  asyncHandler(async (req, res) => {
    const invoice = await ordersService.getOrderInvoice(asString(req.params.orderId), req.user?.id, req.userRole);
    success(res, invoice, "Invoice generated successfully");
  }),
);

ordersRoutes.get(
  "/orders/:orderId/tracking",
  ...orderAuth,
  asyncHandler(async (req, res) => {
    const tracking = await ordersService.getOrderTracking(asString(req.params.orderId), req.user?.id, req.userRole);
    success(res, tracking, "Order tracking info fetched successfully");
  }),
);

ordersRoutes.post(
  "/orders/:orderId/tracking",
  ...orderAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await ordersService.addOrderTracking(asString(req.params.orderId), req.user?.id, req.userRole, req.body);
    success(res, created, "Tracking update added successfully", 201);
  }),
);

ordersRoutes.patch(
  "/orders/:orderId/tracking/:trackingId",
  ...orderAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await ordersService.updateOrderTracking(asString(req.params.trackingId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Tracking entry updated successfully");
  }),
);
