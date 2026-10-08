import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as ordersController from "./orders.controller.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
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



