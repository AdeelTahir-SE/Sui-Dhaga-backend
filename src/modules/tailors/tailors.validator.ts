import { z } from "zod";

export const createTailorSchema = z.object({
  shopName: z.string().min(1),
  specialties: z.array(z.string()).default([]),
  city: z.string().min(1),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  experienceYears: z.number().int().optional(),
  bio: z.string().optional(),
  bannerUrl: z.string().url().optional(),
});

export const updateTailorSchema = createTailorSchema.partial().extend({
  removeImageId: z.string().optional(),
  verified: z.boolean().optional(),
});

export const uploadTailorBannerSchema = z.object({
  bannerUrl: z.string().url().optional(),
  banner: z.string().optional(),
});

export const addGalleryImageSchema = z.object({
  imageUrl: z.string().url().optional(),
  image: z.string().optional(),
  caption: z.string().optional(),
});

export const requestVerificationSchema = z.object({
  documentUrl: z.string().url().optional(),
  documentType: z.string().optional(),
  notes: z.string().optional(),
});

export const tailorServiceSchema = z.object({
  title: z.string().min(1),
  price: z.number().positive(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const tailorAvailabilitySlotSchema = z.object({
  id: z.string().optional(),
  dayOfWeek: z.string().optional(),
  day_of_week: z.string().optional(),
  day: z.string().optional(),
  startTime: z.string().optional(),
  start_time: z.string().optional(),
  openTime: z.string().optional(),
  endTime: z.string().optional(),
  end_time: z.string().optional(),
  closeTime: z.string().optional(),
  isAvailable: z.boolean().optional(),
  is_available: z.boolean().optional(),
  isOpen: z.boolean().optional(),
  hasBreak: z.boolean().optional(),
  has_break: z.boolean().optional(),
  breakStart: z.string().optional(),
  break_start: z.string().optional(),
  breakEnd: z.string().optional(),
  break_end: z.string().optional(),
});

export const tailorAvailabilitySchema = z.union([
  tailorAvailabilitySlotSchema,
  z.array(tailorAvailabilitySlotSchema),
  z.object({
    slots: z.array(tailorAvailabilitySlotSchema).optional(),
    timings: z.array(tailorAvailabilitySlotSchema).optional(),
    dayTimings: z.array(tailorAvailabilitySlotSchema).optional(),
  }),
]);

export const tailorsCompareSchema = z.object({
  tailorIds: z.array(z.string()).min(2),
});

export const getNearbyTailorsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(50).optional(),
  city: z.string().optional(),
  search: z.string().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

