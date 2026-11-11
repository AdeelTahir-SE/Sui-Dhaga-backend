import { z } from "zod";

const colorArraySchema = z.array(z.string()).optional();
const tagsSchema = z.union([z.array(z.string()), z.string()]).optional();

export const createDesignSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["text-to-design", "image-to-design", "sketch-to-design", "manual"]).default("manual"),
  prompt: z.string().optional(),
  enhancedPrompt: z.string().optional(),
  imageUrl: z.string().optional(),
  image: z.string().optional(),
  originalImageUrl: z.string().optional(),
  sketchUrl: z.string().optional(),
  colors: colorArraySchema,
  colorPalette: colorArraySchema,
  fabric: z.union([z.string(), z.record(z.unknown())]).optional(),
  embroidery: z.union([z.string(), z.record(z.unknown())]).optional(),
  measurements: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
  category: z.string().optional(),
  style: z.string().optional(),
  occasion: z.string().optional(),
  tags: tagsSchema,
  isFavorite: z.boolean().optional(),
  favorite: z.boolean().optional(),
  isTrashed: z.boolean().optional(),
  trashed: z.boolean().optional(),
  status: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateDesignSchema = createDesignSchema.partial().extend({
  sharedWithTailorId: z.string().nullable().optional(),
  chatHistory: z.array(z.record(z.unknown())).optional(),
});

export const generateDesignSchema = z.object({
  mode: z.enum(["text-to-design", "image-to-design", "sketch-to-design", "text", "image", "sketch"]).optional(),
  type: z.enum(["text-to-design", "image-to-design", "sketch-to-design"]).optional(),
  prompt: z.string().optional(),
  instructions: z.string().optional(),
  imageUrl: z.string().optional(),
  image: z.string().optional(),
  sketchUrl: z.string().optional(),
  sketch: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  style: z.string().optional(),
  occasion: z.string().optional(),
  fabricPreference: z.string().optional(),
  fabric: z.string().optional(),
  colorPreference: z.union([z.string(), z.array(z.string())]).optional(),
  colors: z.array(z.string()).optional(),
  save: z.boolean().optional(),
});

export const textToDesignSchema = z.object({
  prompt: z.string().min(1),
  category: z.string().optional(),
  fabricPreference: z.string().optional(),
  colorPreference: z.string().optional(),
});

export const imageToDesignSchema = z.object({
  imageUrl: z.string().url().optional(),
  image: z.string().optional(),
  instructions: z.string().optional(),
  prompt: z.string().optional(),
});

export const sketchToDesignSchema = z.object({
  sketchUrl: z.string().url().optional(),
  sketch: z.string().optional(),
  instructions: z.string().optional(),
  prompt: z.string().optional(),
});

export const designChatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  designId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    )
    .optional(),
  generateImage: z.boolean().optional(),
  context: z.record(z.unknown()).optional(),
});

export const shareDesignSchema = z.object({
  tailorId: z.string().min(1),
});
