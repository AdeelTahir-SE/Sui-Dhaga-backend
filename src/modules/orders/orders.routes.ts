import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as ordersController from "./orders.controller.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  addOrderTrackingSchema,
  updateOrderTrackingSchema,
} from "./orders.validator.js";

export const ordersRoutes = Router();

const orderAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

ordersRoutes.get("/orders", ...orderAuth, asyncHandler(ordersController.getOrders));
ordersRoutes.post("/orders", requireAuth, requireRole("customer", "admin"), validate(createOrderSchema), asyncHandler(ordersController.createOrder));
ordersRoutes.get("/orders/:orderId", ...orderAuth, asyncHandler(ordersController.getOrderById));
ordersRoutes.patch("/orders/:orderId/status", requireAuth, requireRole("tailor", "admin"), validate(updateOrderStatusSchema), asyncHandler(ordersController.updateOrderStatus));
ordersRoutes.post("/orders/:orderId/cancel", ...orderAuth, asyncHandler(ordersController.cancelOrder));
ordersRoutes.get("/orders/:orderId/invoice", ...orderAuth, asyncHandler(ordersController.getOrderInvoice));

ordersRoutes.get("/orders/:orderId/tracking", ...orderAuth, asyncHandler(ordersController.getOrderTracking));
ordersRoutes.post("/orders/:orderId/tracking", requireAuth, requireRole("tailor", "admin"), validate(addOrderTrackingSchema), asyncHandler(ordersController.addOrderTracking));
ordersRoutes.patch("/orders/:orderId/tracking/:trackingId", requireAuth, requireRole("tailor", "admin"), validate(updateOrderTrackingSchema), asyncHandler(ordersController.updateOrderTracking));
