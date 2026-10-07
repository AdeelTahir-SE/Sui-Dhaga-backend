import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as notificationsController from "./notifications.controller.js";

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
 */
notificationsRoutes.get("/notifications", requireAuth, asyncHandler(notificationsController.getNotifications));

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
notificationsRoutes.post("/notifications/push-token", requireAuth, asyncHandler(notificationsController.registerPushToken));

/**
 * @openapi
 * /notifications:
 *   post:
 *     summary: Create a notification (admin or system)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Notification created successfully
 */
notificationsRoutes.post("/notifications", requireAuth, asyncHandler(notificationsController.createNotification));

/**
 * @openapi
 * /notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
notificationsRoutes.patch("/notifications/read-all", requireAuth, asyncHandler(notificationsController.markAllAsRead));
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

