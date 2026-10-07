export interface MarkNotificationReadPayload {
  notificationId: string;
}

export type NotificationType = "order" | "appointment" | "message" | "system" | "info";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  data?: Record<string, unknown>;
}

export interface RegisterPushTokenInput {
  pushToken: string;
}
