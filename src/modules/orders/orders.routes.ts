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

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: List orders for current user or tailor
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated orders list
 *   post:
 *     summary: Place a new custom tailoring order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tailorId, serviceId]
 *             properties:
 *               tailorId: { type: string, format: uuid }
 *               serviceId: { type: string, format: uuid }
 *               designId: { type: string, format: uuid }
 *               measurementId: { type: string, format: uuid }
 *               notes: { type: string }
 *               amount: { type: number, example: 5000 }
 *     responses:
 *       201:
 *         description: Order created successfully
 */
ordersRoutes.get("/orders", ...orderAuth, asyncHandler(ordersController.getOrders));
/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: List orders for currently authenticated user or tailor (alias of /orders)
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated orders list
 */
ordersRoutes.get("/orders/my", ...orderAuth, asyncHandler(ordersController.getOrders));
ordersRoutes.post("/orders", requireAuth, requireRole("customer", "admin"), validate(createOrderSchema), asyncHandler(ordersController.createOrder));

/**
 * @swagger
 * /orders/{orderId}:
 *   get:
 *     summary: Get complete order details with designs, measurements, and tracking
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order details
 */
ordersRoutes.get("/orders/:orderId", ...orderAuth, asyncHandler(ordersController.getOrderById));
/**
 * @swagger
 * /orders/{orderId}/parties:
 *   get:
 *     summary: Get customer and tailor participant details for an order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order participant details retrieved
 */
ordersRoutes.get("/orders/:orderId/parties", ...orderAuth, asyncHandler(ordersController.getOrderParties));

/**
 * @swagger
 * /orders/{orderId}/status:
 *   patch:
 *     summary: Update order lifecycle status
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending, confirmed, in_progress, completed, cancelled] }
 *     responses:
 *       200:
 *         description: Order status updated
 */
ordersRoutes.patch("/orders/:orderId/status", requireAuth, requireRole("tailor", "admin"), validate(updateOrderStatusSchema), asyncHandler(ordersController.updateOrderStatus));

/**
 * @openapi
 * /orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *   patch:
 *     summary: Cancel an order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 */
ordersRoutes.post("/orders/:orderId/cancel", ...orderAuth, asyncHandler(ordersController.cancelOrder));
ordersRoutes.patch("/orders/:orderId/cancel", ...orderAuth, asyncHandler(ordersController.cancelOrder));

/**
 * @openapi
 * /orders/{orderId}/invoice:
 *   get:
 *     summary: Generate and fetch order invoice
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invoice generated successfully
 */
ordersRoutes.get("/orders/:orderId/invoice", ...orderAuth, asyncHandler(ordersController.getOrderInvoice));

/**
 * @openapi
 * /orders/{orderId}/tracking:
 *   get:
 *     summary: Get tracking timeline events for an order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order tracking events retrieved
 *   post:
 *     summary: Add a tracking timeline update to an order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, example: "cutting" }
 *               description: { type: string, example: "Fabric cutting initiated according to measurements" }
 *               location: { type: string, example: "Lahore Atelier" }
 *     responses:
 *       201:
 *         description: Tracking update added successfully
 */
ordersRoutes.get("/orders/:orderId/tracking", ...orderAuth, asyncHandler(ordersController.getOrderTracking));
ordersRoutes.post(
  "/orders/:orderId/tracking",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(addOrderTrackingSchema),
  asyncHandler(ordersController.addOrderTracking)
);

/**
 * @openapi
 * /orders/tracking/{trackingId}:
 *   patch:
 *     summary: Update an existing order tracking event
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status: { type: string }
 *               description: { type: string }
 *               location: { type: string }
 *     responses:
 *       200:
 *         description: Tracking entry updated successfully
 */
ordersRoutes.patch(
  "/orders/tracking/:trackingId",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(updateOrderTrackingSchema),
  asyncHandler(ordersController.updateOrderTracking)
);



