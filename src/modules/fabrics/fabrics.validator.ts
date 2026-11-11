import { z } from "zod";

export const createFabricSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(80),
  origin: z.string().trim().max(120).optional(),
  pricePerMeter: z.coerce.number().min(0).optional(),
  price_per_meter: z.coerce.number().min(0).optional(),
  gsmWeight: z.coerce.number().int().min(0).optional(),
  gsm_weight: z.coerce.number().int().min(0).optional(),
  season: z.string().trim().max(60).optional(),
  careInstructions: z.string().trim().max(500).optional(),
  care_instructions: z.string().trim().max(500).optional(),
  description: z.string().trim().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  image_url: z.string().url().optional(),
  colorSwatches: z.array(z.string()).optional(),
  color_swatches: z.array(z.string()).optional(),
  inStock: z.boolean().optional(),
  in_stock: z.boolean().optional(),
});

export const updateFabricSchema = createFabricSchema.partial();
