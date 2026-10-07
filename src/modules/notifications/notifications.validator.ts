import { z } from "zod";

export const markNotificationReadSchema = z.object({
  notificationId: z.string().min(1),
});

export const registerPushTokenSchema = z.object({
  pushToken: z.string().min(1, "Push token is required"),
});

export const createNotificationSchema = z.object({
  userId: z.string().uuid("Valid user ID is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  type: z.enum(["order", "appointment", "message", "system", "info"]).optional(),
  data: z.record(z.unknown()).optional(),
});
