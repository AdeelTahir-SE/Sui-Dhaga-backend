import { z } from "zod";

export const createTailorSchema = z.object({
  shopName: z.string().min(1),
  specialties: z.array(z.string()).default([]),
  city: z.string().min(1),
  address: z.string().optional(),
  experienceYears: z.number().int().optional(),
  bio: z.string().optional(),
});

export const updateTailorSchema = createTailorSchema.partial().extend({
  removeImageId: z.string().optional(),
  verified: z.boolean().optional(),
});

export const addGalleryImageSchema = z.object({
  imageUrl: z.string().url(),
  caption: z.string().optional(),
});

export const tailorServiceSchema = z.object({
  title: z.string().min(1),
  price: z.number().positive(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const tailorAvailabilitySchema = z.object({
  dayOfWeek: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  isAvailable: z.boolean().default(true),
});

export const tailorsCompareSchema = z.object({
  tailorIds: z.array(z.string()).min(2),
});
