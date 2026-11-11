import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1, "Coupon code is required").max(50),
  orderAmount: z.coerce.number().min(0).optional(),
  amount: z.coerce.number().min(0).optional(),
  tailorId: z.string().optional(),
});
