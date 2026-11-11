import { z } from "zod";

const PROVIDERS = [
  "stripe",
  "safepay",
  "jazzcash",
  "easypaisa",
  "sadapay",
  "nayapay",
  "cod",
] as const;

export const createCheckoutSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  amount: z.coerce.number().positive().optional(),
  provider: z.enum(PROVIDERS).default("safepay"),
  currency: z.string().default("PKR"),
  couponCode: z.string().trim().optional(),
  coupon_code: z.string().trim().optional(),
  paymentMethodId: z.string().optional(),
  payment_method_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  transactionId: z.string().min(1),
  provider: z.enum(PROVIDERS).optional(),
});
