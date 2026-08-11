import { z } from "zod";

export const createFabricSchema = z.object({
  name: z.string().min(1),
  material: z.string().min(1),
  pricePerMeter: z.number().positive(),
  color: z.string().optional(),
  pattern: z.string().optional(),
  imageUrl: z.string().url().optional(),
  inStock: z.boolean().default(true),
});

export const updateFabricSchema = createFabricSchema.partial();
