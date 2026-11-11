import { z } from "zod";

export const createTailorSchema = z.object({
  shopName: z.string().min(1),
  specialties: z.array(z.string()).default([]),
  city: z.string().min(1),
  address: z.string().optional(),
  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
  location: z
    .union([
      z.object({
        city: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        latitude: z.coerce.number().optional().nullable(),
        longitude: z.coerce.number().optional().nullable(),
      }),
      z.string(),
    ])
    .optional()
    .nullable(),
  experienceYears: z.coerce.number().int().optional(),
  bio: z.string().optional(),
  bannerUrl: z.string().url().optional(),
  organizationName: z.string().optional().nullable(),
  organization: z.string().optional().nullable(),
  organization_name: z.string().optional().nullable(),
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
  price: z.coerce.number().positive(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
  is_active: z.boolean().optional(),
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

export const tailorAvailabilityContainerSchema = z.union([
  z.object({ slots: z.array(tailorAvailabilitySlotSchema) }),
  z.object({ timings: z.array(tailorAvailabilitySlotSchema) }),
  z.object({ dayTimings: z.array(tailorAvailabilitySlotSchema) }),
]);

export const tailorAvailabilitySchema = z.union([
  tailorAvailabilityContainerSchema,
  z.array(tailorAvailabilitySlotSchema),
  tailorAvailabilitySlotSchema,
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
  organization: z.string().optional(),
  organizationName: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const blockedDateEntrySchema = z.union([
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use YYYY-MM-DD format"),
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use YYYY-MM-DD format"),
    reason: z.string().max(255).optional(),
  }),
]);

export const blockedDatesSchema = z.union([
  z.object({ blockedDates: z.array(blockedDateEntrySchema) }),
  z.object({ dates: z.array(blockedDateEntrySchema) }),
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format"),
    reason: z.string().max(255).optional(),
  }),
]);

export const payoutSettingsSchema = z.object({
  provider: z
    .enum(["bank_transfer", "jazzcash", "easypaisa", "sadapay", "nayapay", "stripe"])
    .optional(),
  accountTitle: z.string().min(2).max(120).optional(),
  account_title: z.string().min(2).max(120).optional(),
  accountNumber: z.string().min(4).max(64).optional(),
  account_number: z.string().min(4).max(64).optional(),
  bankName: z.string().max(120).optional(),
  bank_name: z.string().max(120).optional(),
  iban: z.string().max(50).optional(),
  branchCode: z.string().max(30).optional(),
  branch_code: z.string().max(30).optional(),
  walletPhone: z.string().max(30).optional(),
  wallet_phone: z.string().max(30).optional(),
  autoPayout: z.boolean().optional(),
  auto_payout: z.boolean().optional(),
});

export const payoutRequestSchema = z.object({
  amount: z.coerce.number().positive("Payout amount must be greater than zero"),
  provider: z
    .enum(["bank_transfer", "jazzcash", "easypaisa", "sadapay", "nayapay", "stripe"])
    .optional(),
  accountTitle: z.string().max(120).optional(),
  account_title: z.string().max(120).optional(),
  accountNumber: z.string().max(64).optional(),
  account_number: z.string().max(64).optional(),
  bankName: z.string().max(120).optional(),
  bank_name: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});
