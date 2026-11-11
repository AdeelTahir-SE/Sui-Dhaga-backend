import { z } from "zod";

const optionalBoolean = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((val) => val === true || val === "true")
  .optional();

export const updateProfileSchema = z.object({
  name: z.string().trim().optional(),
  fullName: z.string().trim().optional(),
  full_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  bio: z.string().trim().optional(),
  avatarUrl: z.string().trim().nullable().optional(),
  avatar_url: z.string().trim().nullable().optional(),
  avatar: z.string().trim().nullable().optional(),
  image: z.string().trim().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  removeAvatar: optionalBoolean,
});

export const updateAvatarSchema = z.object({
  avatarUrl: z.string().trim().nullable().optional(),
  avatar_url: z.string().trim().nullable().optional(),
  avatar: z.string().trim().nullable().optional(),
  image: z.string().trim().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  url: z.string().trim().nullable().optional(),
  dataUrl: z.string().trim().nullable().optional(),
  base64: z.string().trim().optional(),
  mimeType: z.string().trim().optional(),
  fileName: z.string().trim().optional(),
});

export const reportUserSchema = z.object({
  targetId: z.string().min(1, "Target ID is required").optional(),
  target_id: z.string().min(1).optional(),
  targetUserId: z.string().min(1).optional(),
  reason: z.string().min(1, "Reason is required").optional(),
  details: z.string().optional(),
  description: z.string().optional(),
});

export const blockUserSchema = z.object({
  targetId: z.string().min(1, "Target user ID is required").optional(),
  target_id: z.string().min(1).optional(),
  targetUserId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
});
