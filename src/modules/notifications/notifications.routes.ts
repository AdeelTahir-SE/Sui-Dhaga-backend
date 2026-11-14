import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as notificationsController from "./notifications.controller.js";
import { registerPushTokenSchema, createNotificationSchema } from "./notifications.validator.js";

export const notificationsRoutes = Router();

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List notifications for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *   post:
 *     summary: Create a notification alert
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               userId: { type: string }
 *               title: { type: string }
 *               message: { type: string }
 *               type: { type: string, default: "system" }
 *               data: { type: object }
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
notificationsRoutes.get("/notifications", requireAuth, asyncHandler(notificationsController.getNotifications));
notificationsRoutes.post("/notifications", requireAuth, validate(createNotificationSchema), asyncHandler(notificationsController.createNotification));

/**
 * @openapi
 * /notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count for authenticated user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 */
notificationsRoutes.get("/notifications/unread-count", requireAuth, asyncHandler(notificationsController.getUnreadCount));

/**
 * @openapi
 * /notifications/push-token:
 *   post:
 *     summary: Register or update device push token
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Push token registered successfully
 */
notificationsRoutes.post("/notifications/push-token", requireAuth, validate(registerPushTokenSchema), asyncHandler(notificationsController.registerPushToken));

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
notificationsRoutes.post("/notifications/read-all", requireAuth, asyncHandler(notificationsController.markAllAsRead));

/**
 * @openapi
 * /notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
notificationsRoutes.patch("/notifications/:notificationId/read", requireAuth, asyncHandler(notificationsController.markAsRead));

/**
 * @openapi
 * /notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 */
notificationsRoutes.delete("/notifications/:notificationId", requireAuth, asyncHandler(notificationsController.deleteNotification));

