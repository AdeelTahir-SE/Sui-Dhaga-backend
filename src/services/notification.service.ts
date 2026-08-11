import { env } from "../config/env.js";

export interface PushNotificationPayload {
  toToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const notificationService = {
  async sendPushNotification(payload: PushNotificationPayload) {
    if (!env.EXPO_ACCESS_TOKEN) {
      console.log(`[Push Notification Mock] To: ${payload.toToken} | Title: ${payload.title}`);
      return { status: "queued", id: "mock-notification-id" };
    }

    return { status: "sent", id: "expo-notification-id" };
  },
};
