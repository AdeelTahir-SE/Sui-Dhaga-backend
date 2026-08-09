import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { notificationsService } from "./notifications.service.js";

export const notificationsRoutes = Router();

notificationsRoutes.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await notificationsService.getNotifications(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Notifications fetched successfully");
  }),
);

notificationsRoutes.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await notificationsService.markNotificationRead(asString(req.params.notificationId), req.user?.id, req.userRole);
    success(res, updated, "Notification marked as read");
  }),
);

notificationsRoutes.patch(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await notificationsService.markAllRead(req.user?.id, req.userRole);
    success(res, result, "All notifications marked as read");
  }),
);

notificationsRoutes.delete(
  "/notifications/:notificationId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await notificationsService.deleteNotification(asString(req.params.notificationId), req.user?.id, req.userRole);
    success(res, null, "Notification deleted successfully");
  }),
);
