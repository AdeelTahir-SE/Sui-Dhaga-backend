import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { notificationsService } from "./notifications.service.js";
import { registerPushTokenSchema, createNotificationSchema } from "./notifications.validator.js";

export const getNotifications: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await notificationsService.getNotifications(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Notifications fetched successfully");
};

export const getUnreadCount: RequestHandler = async (req, res) => {
  const data = await notificationsService.getUnreadCount(req.user?.id);
  success(res, data, "Unread notifications count fetched");
};

export const registerPushToken: RequestHandler = async (req, res) => {
  const parsed = registerPushTokenSchema.parse(req.body);
  const result = await notificationsService.savePushToken(req.user?.id, parsed.pushToken);
  success(res, result, "Push token saved successfully");
};

export const createNotification: RequestHandler = async (req, res) => {
  const parsed = createNotificationSchema.parse(req.body);
  const created = await notificationsService.createNotification(parsed);
  success(res, created, "Notification created successfully", 201);
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

