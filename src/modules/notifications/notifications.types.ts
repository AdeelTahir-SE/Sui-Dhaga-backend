export interface MarkNotificationReadPayload {
  notificationId: string;
}

export type NotificationType =
  | "order"
  | "order_update"
  | "appointment"
  | "message"
  | "design"
  | "payout"
  | "refund"
  | "dispute"
  | "review_reply"
  | "follow"
  | "system"
  | "info";

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
