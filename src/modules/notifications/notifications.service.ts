import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const notificationsService = {
  async getNotifications(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "notifications",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async markNotificationRead(notificationId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "notifications",
      id: notificationId,
      userId,
      userRole,
      data: { read: true, read_at: new Date().toISOString() },
    });
  },

  async markAllRead(userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "notifications",
      userId,
      userRole,
      data: { allRead: true, read_at: new Date().toISOString() },
    });
  },

  async deleteNotification(notificationId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "notifications",
      id: notificationId,
      userId,
      userRole,
    });
  },
};
