import { z } from "zod";

export const adminBlockUserSchema = z.object({
  blocked: z.boolean().default(true),
});

export const adminVerifyTailorSchema = z.object({
  status: z.enum(["verified", "rejected"]).default("verified"),
});
