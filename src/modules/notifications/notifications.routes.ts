import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as notificationsController from "./notifications.controller.js";

export const notificationsRoutes = Router();

notificationsRoutes.get("/notifications", requireAuth, asyncHandler(notificationsController.getNotifications));
notificationsRoutes.patch("/notifications/:notificationId/read", requireAuth, asyncHandler(notificationsController.markAsRead));
notificationsRoutes.patch("/notifications/read-all", requireAuth, asyncHandler(notificationsController.markAllAsRead));
notificationsRoutes.delete("/notifications/:notificationId", requireAuth, asyncHandler(notificationsController.deleteNotification));
