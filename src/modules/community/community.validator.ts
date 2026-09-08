import { z } from "zod";

export const createCommunityPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

export const updateCommunityPostSchema = createCommunityPostSchema.partial();

export const addCommunityCommentSchema = z.object({
  content: z.string().min(1),
});
