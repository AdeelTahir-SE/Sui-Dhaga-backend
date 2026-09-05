import {
  getDbClient,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const notificationsService = {
  async getNotifications(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    return fetchTableData({
      table: "notifications",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async markNotificationRead(notificationId: string, userId: string | undefined, userRole: string | undefined) {
    const client = getDbClient();
    let query = client
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async markAllRead(userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { error } = await client
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async deleteNotification(notificationId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "notifications",
      id: notificationId,
      userId,
      userRole,
    });
  },
};

