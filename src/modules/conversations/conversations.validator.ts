import { z } from "zod";

export const createConversationSchema = z.object({
  tailorId: z.string().optional(),
  clientId: z.string().optional(),
  participantId: z.string().optional(),
  initialMessage: z.string().optional(),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1),
  attachments: z.array(z.string()).optional(),
});

export const addAttachmentSchema = z.object({
  fileUrl: z.string().url().optional(),
  file: z.string().optional(),
  fileType: z.string().optional(),
});

