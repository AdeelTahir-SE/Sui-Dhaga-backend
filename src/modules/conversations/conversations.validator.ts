import { z } from "zod";

export const createConversationSchema = z.object({
  participantId: z.string().min(1),
  initialMessage: z.string().optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

export const addAttachmentSchema = z.object({
  fileUrl: z.string().url(),
  fileType: z.string().optional(),
});
