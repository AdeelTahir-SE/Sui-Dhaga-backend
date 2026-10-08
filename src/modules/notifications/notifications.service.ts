import {
  getDbClient,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { notificationService } from "../../services/notification.service.js";
import type { CreateNotificationInput } from "./notifications.types.js";

export const notificationsService = {
  async getNotifications(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    return fetchTableData({
      table: "notifications",
      select: "id, user_id, title, message, type, is_read, read_at, data, created_at",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getUnreadCount(userId: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { count, error } = await client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) throw new AppError(error.message, 400);
    return { unreadCount: count ?? 0 };
  },

  async createNotification(params: CreateNotificationInput) {
    if (!params.userId) throw new AppError("Recipient user ID is required", 400);
    const client = getDbClient();

    const insertPayload = {
      user_id: params.userId,
      title: params.title,
      message: params.message,
      type: params.type || "system",
      data: params.data || {},
      is_read: false,
    };

    const { data: created, error } = await client
      .from("notifications")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.warn("[NotificationsService] Error inserting notification:", error.message);
      throw new AppError(error.message, 400);
    }

    // Attempt push notification if recipient has registered a push token
    try {
      const { data: profile } = await client
        .from("profiles")
        .select("push_token")
        .eq("id", params.userId)
        .maybeSingle();

      if (profile?.push_token) {
        await notificationService.sendPushNotification({
          toToken: profile.push_token,
          title: params.title,
          body: params.message,
          data: {
            ...params.data,
            notificationId: created?.id,
            type: params.type || "system",
          },
        });
      }
    } catch (pushErr: any) {
      console.warn("[NotificationsService] Push delivery warning:", pushErr?.message || pushErr);
    }

    return created;
  },

  async savePushToken(userId: string | undefined, pushToken: string) {
    if (!userId) throw new AppError("Authentication required", 401);
    if (!pushToken || typeof pushToken !== "string") {
      throw new AppError("Valid push token is required", 400);
    }

    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .update({ push_token: pushToken.trim() })
      .eq("id", userId)
      .select("id, push_token")
      .single();

    if (error) {
      // If column does not exist yet in profiles table, log warning gracefully
      console.warn("[NotificationsService] Could not save push token:", error.message);
      return { success: false, message: error.message };
    }

    return { success: true, pushToken: data.push_token };
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


