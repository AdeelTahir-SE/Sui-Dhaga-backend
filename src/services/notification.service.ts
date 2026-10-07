import { env } from "../config/env.js";

export interface PushNotificationPayload {
  toToken: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export const notificationService = {
  async sendPushNotification(payload: PushNotificationPayload) {
    if (!payload.toToken || typeof payload.toToken !== "string") {
      return { status: "skipped", reason: "Invalid or missing push token" };
    }

    const token = payload.toToken.trim();
    const isExpoToken = token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");

    // If it's a valid Expo Push token, send to Expo push notification service
    if (isExpoToken) {
      try {
        const headers: Record<string, string> = {
          "Accept": "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        };

        if (env.EXPO_ACCESS_TOKEN) {
          headers["Authorization"] = `Bearer ${env.EXPO_ACCESS_TOKEN}`;
        }

        const res = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers,
          body: JSON.stringify({
            to: token,
            sound: "default",
            title: payload.title,
            body: payload.body,
            data: payload.data || {},
            priority: "high",
            channelId: "default",
            _displayInForeground: true,
          }),
        });


        const data = await res.json().catch(() => null);
        console.log(`[Expo Push Sent] To: ${token} | Title: "${payload.title}" | Status: ${res.status}`);
        return { status: "sent", data };
      } catch (err: any) {
        console.warn(`[Expo Push Failed] To: ${token} | Error: ${err?.message || err}`);
        return { status: "failed", error: err?.message };
      }
    }

    // Otherwise log mock notification (for dev / simulator tokens)
    console.log(`[Push Notification Mock] To: ${token} | Title: "${payload.title}" | Body: "${payload.body}"`);
    return { status: "mocked", id: `mock-${Date.now()}` };
  },
};

