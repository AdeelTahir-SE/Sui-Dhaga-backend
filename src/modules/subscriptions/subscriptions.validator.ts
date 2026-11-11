import { z } from "zod";

export const subscriptionCheckoutSchema = z
  .object({
    planId: z.string().optional(),
    plan_id: z.string().optional(),
    planSlug: z.string().optional(),
    plan_slug: z.string().optional(),
    billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
    billing_cycle: z.enum(["monthly", "yearly"]).optional(),
    provider: z
      .enum([
        "stripe",
        "safepay",
        "jazzcash",
        "easypaisa",
        "sadapay",
        "nayapay",
        "free",
        "direct",
        "manual",
      ])
      .optional(),
  })
  .refine(
    (data) => Boolean(data.planId || data.plan_id || data.planSlug || data.plan_slug),
    { message: "planId or planSlug is required" }
  );
