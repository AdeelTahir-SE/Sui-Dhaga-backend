import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["customer", "tailor"]).default("customer"),
  name: z.string().min(1).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{7,15}$/, "Please enter a valid phone number (7-15 digits)")
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8),
  token: z.string().optional(),
  email: z.string().email().optional(),
});

export const googleAuthSchema = z.object({
  code: z.string().optional(),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
  token: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  fullName: z.string().optional(),
  avatar: z.string().optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().optional(),
  googleId: z.string().optional(),
});

export const completeProfileSchema = z.object({
  role: z.enum(["customer", "tailor"]),
  phone: z.string().optional(),
  name: z.string().optional(),
  fullName: z.string().optional(),
  shopName: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  specialties: z.array(z.string()).optional(),
});

