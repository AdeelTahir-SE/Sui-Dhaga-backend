import { z } from "zod";

const optionalRedirectUrl = z.string().trim().url().optional().or(z.literal(""));

export const registerSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(8),
    role: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.enum(["customer", "tailor"]))
      .default("customer"),
    name: z.string().trim().optional(),
    fullName: z.string().trim().optional(),
    full_name: z.string().trim().optional(),
    phone: z.string().trim().optional().or(z.literal("")),
    emailRedirectTo: optionalRedirectUrl,
    redirectTo: optionalRedirectUrl,
    appRedirect: z.string().trim().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.phone) {
      const normalized = data.phone.replace(/[\s()-]/g, "");
      if (!/^\+?[0-9]{7,15}$/.test(normalized)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["phone"],
          message: "Please enter a valid phone number (7-15 digits)",
        });
      }
    }
  });

export const resendConfirmationSchema = z.object({
  email: z.string().trim().email(),
  emailRedirectTo: optionalRedirectUrl,
  redirectTo: optionalRedirectUrl,
  appRedirect: z.string().trim().optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
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

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).optional(),
    current_password: z.string().min(1).optional(),
    oldPassword: z.string().min(1).optional(),
    newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
    new_password: z.string().min(8, "New password must be at least 8 characters").optional(),
    password: z.string().min(8, "New password must be at least 8 characters").optional(),
  })
  .refine(
    (data) => Boolean(data.currentPassword || data.current_password || data.oldPassword),
    { message: "Current password is required" }
  )
  .refine(
    (data) => Boolean(data.newPassword || data.new_password || data.password),
    { message: "New password (minimum 8 characters) is required" }
  );
