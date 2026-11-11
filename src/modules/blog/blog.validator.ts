import { z } from "zod";

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(2).max(200).optional(),
  excerpt: z.string().trim().max(600).optional(),
  content: z.string().trim().min(10),
  coverImageUrl: z.string().url().optional(),
  cover_image_url: z.string().url().optional(),
  category: z.string().trim().max(80).default("Editorial"),
  tags: z.array(z.string()).default([]),
  authorName: z.string().trim().max(120).optional(),
  author_name: z.string().trim().max(120).optional(),
  readTimeMinutes: z.coerce.number().int().min(1).max(60).optional(),
  read_time_minutes: z.coerce.number().int().min(1).max(60).optional(),
  isPublished: z.boolean().optional(),
  is_published: z.boolean().optional(),
});

export const updateBlogPostSchema = createBlogPostSchema.partial();
