import { z } from "zod";

export const wishlistTailorSchema = z.object({
  tailorId: z.string().min(1),
});

export const wishlistDesignSchema = z.object({
  designId: z.string().min(1),
});
