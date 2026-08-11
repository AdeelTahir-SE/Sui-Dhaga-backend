import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  bio: z.string().optional(),
});

export const updateAvatarSchema = z.object({
  avatarUrl: z.string().url(),
});
