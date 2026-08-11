import { z } from "zod";

export const createCheckoutSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  provider: z.enum(["stripe", "safepay"]),
  currency: z.string().default("PKR"),
});

export const confirmPaymentSchema = z.object({
  paymentId: z.string().min(1),
  transactionId: z.string().min(1),
  provider: z.enum(["stripe", "safepay"]),
});
