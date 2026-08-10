import "dotenv/config";
import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalEmail = z.string().email().optional().or(z.literal(""));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_ORIGINS: z.string().default("http://localhost:3000"),
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SAFEPAY_SECRET_KEY: z.string().optional(),
  SAFEPAY_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM: optionalEmail,
  EXPO_ACCESS_TOKEN: z.string().optional()
});

export const env = envSchema.parse(process.env);
