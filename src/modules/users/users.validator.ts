import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  fullName: z.string().optional(),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});

export const updateAvatarSchema = z.object({
  avatarUrl: z.string().url().optional(),
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
