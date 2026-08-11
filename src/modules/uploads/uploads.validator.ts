import { z } from "zod";

export const uploadImageSchema = z.object({
  image: z.string().min(1),
  folder: z.string().optional(),
});

export const uploadImagesSchema = z.object({
  images: z.array(z.string().min(1)).min(1),
  folder: z.string().optional(),
});

export const uploadFileSchema = z.object({
  file: z.string().min(1),
  fileName: z.string().optional(),
  folder: z.string().optional(),
});
