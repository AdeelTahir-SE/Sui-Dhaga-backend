import { z } from "zod";

const METHOD_TYPES = [
  "card",
  "jazzcash",
  "easypaisa",
  "sadapay",
  "nayapay",
  "bank_transfer",
] as const;

export const createPaymentMethodSchema = z.object({
  type: z.enum(METHOD_TYPES).default("card"),
  provider: z.string().trim().max(40).optional(),
  label: z.string().trim().max(80).optional(),
  brand: z.string().trim().max(40).optional(),
  last4: z.string().trim().min(4).max(4).optional(),
  cardNumber: z.string().trim().optional(),
  expiryMonth: z.coerce.number().int().min(1).max(12).optional(),
  expiry_month: z.coerce.number().int().min(1).max(12).optional(),
  expiryYear: z.coerce.number().int().min(2024).max(2060).optional(),
  expiry_year: z.coerce.number().int().min(2024).max(2060).optional(),
  phone: z.string().trim().max(25).optional(),
  accountNumber: z.string().trim().max(40).optional(),
  account_number: z.string().trim().max(40).optional(),
  holderName: z.string().trim().max(120).optional(),
  holder_name: z.string().trim().max(120).optional(),
  providerToken: z.string().trim().max(255).optional(),
  provider_token: z.string().trim().max(255).optional(),
  isDefault: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

export const updatePaymentMethodSchema = createPaymentMethodSchema.partial();
