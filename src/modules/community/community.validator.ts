import { z } from "zod";

export const createCommunityPostSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  caption: z.string().optional(),
  category: z.string().optional(),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

export const updateCommunityPostSchema = createCommunityPostSchema.partial();

export const addCommunityCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty"),
});
