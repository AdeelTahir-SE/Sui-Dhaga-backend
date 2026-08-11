import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { notificationsService } from "./notifications.service.js";

export const getNotifications: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await notificationsService.getNotifications(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Notifications fetched successfully");
};

export const markAsRead: RequestHandler = async (req, res) => {
  const updated = await notificationsService.markNotificationRead(asString(req.params.notificationId), req.user?.id, req.userRole);
  success(res, updated, "Notification marked as read");
};

export const markAllAsRead: RequestHandler = async (req, res) => {
  await notificationsService.markAllRead(req.user?.id, req.userRole);
  success(res, null, "All notifications marked as read");
};

export const deleteNotification: RequestHandler = async (req, res) => {
  await notificationsService.deleteNotification(asString(req.params.notificationId), req.user?.id, req.userRole);
  success(res, null, "Notification deleted successfully");
};
