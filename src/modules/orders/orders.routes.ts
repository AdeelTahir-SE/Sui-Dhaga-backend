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
 * @swagger
 * /orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel an existing order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order cancelled
 */
ordersRoutes.post("/orders/:orderId/cancel", ...orderAuth, asyncHandler(ordersController.cancelOrder));

/**
 * @swagger
 * /orders/{orderId}/invoice:
 *   get:
 *     summary: Generate and retrieve digital invoice for an order
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order invoice metadata and details
 */
ordersRoutes.get("/orders/:orderId/invoice", ...orderAuth, asyncHandler(ordersController.getOrderInvoice));

/**
 * @swagger
 * /orders/{orderId}/tracking:
 *   get:
 *     summary: Get order progress tracking timeline events
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of tracking status checkpoints
 *   post:
 *     summary: Add a new tracking status checkpoint to an order
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
 *               status: { type: string, example: "Fabric Cutting In Progress" }
 *               description: { type: string }
 *               location: { type: string }
 *     responses:
 *       201:
 *         description: Tracking event added
 */
ordersRoutes.get("/orders/:orderId/tracking", ...orderAuth, asyncHandler(ordersController.getOrderTracking));
ordersRoutes.post("/orders/:orderId/tracking", requireAuth, requireRole("tailor", "admin"), validate(addOrderTrackingSchema), asyncHandler(ordersController.addOrderTracking));

/**
 * @swagger
 * /orders/{orderId}/tracking/{trackingId}:
 *   patch:
 *     summary: Update an existing order tracking event
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: trackingId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *         description: Tracking checkpoint updated
 */
ordersRoutes.patch("/orders/:orderId/tracking/:trackingId", requireAuth, requireRole("tailor", "admin"), validate(updateOrderTrackingSchema), asyncHandler(ordersController.updateOrderTracking));

