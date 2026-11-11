import { z } from "zod";

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const updateReviewSchema = createReviewSchema.partial();

export const replyReviewSchema = z
  .object({
    reply: z.string().trim().min(1).max(2000).optional(),
    tailorReply: z.string().trim().min(1).max(2000).optional(),
    comment: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((val) => Boolean(val.reply || val.tailorReply || val.comment), {
    message: "Reply text is required",
  });
