import { z } from "zod";

export const textToDesignSchema = z.object({
  prompt: z.string().min(1),
  category: z.string().optional(),
  fabricPreference: z.string().optional(),
  colorPreference: z.string().optional(),
});

export const imageToDesignSchema = z.object({
  imageUrl: z.string().url(),
  instructions: z.string().optional(),
});

export const sketchToDesignSchema = z.object({
  sketchUrl: z.string().url(),
  instructions: z.string().optional(),
});

export const designChatSchema = z.object({
  message: z.string().min(1),
  designId: z.string().optional(),
});

export const updateDesignSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  prompt: z.string().optional(),
  imageUrl: z.string().optional(),
  colors: z.array(z.string()).optional(),
  fabric: z.string().optional(),
  embroidery: z.string().optional(),
  measurements: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

export const shareDesignSchema = z.object({
  tailorId: z.string().min(1),
});
