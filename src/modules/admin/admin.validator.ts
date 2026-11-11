import { z } from "zod";

export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1).max(120).optional(),
  full_name: z.string().min(1).max(120).optional(),
  role: z.enum(["customer", "tailor", "admin"]).default("customer"),
  phone: z.string().max(30).optional(),
  status: z.enum(["active", "blocked"]).default("active"),
  shopName: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
});

export const adminUpdateUserSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  full_name: z.string().min(1).max(120).optional(),
  role: z.enum(["customer", "tailor", "admin"]).optional(),
  status: z.enum(["active", "blocked"]).optional(),
  phone: z.string().max(30).optional(),
  bio: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
});

export const adminUpdateTailorSchema = z.object({
  shopName: z.string().max(120).optional(),
  shop_name: z.string().max(120).optional(),
  city: z.string().max(80).optional(),
  address: z.string().max(300).optional(),
  bio: z.string().max(2000).optional(),
  specialties: z.array(z.string()).optional(),
  verified: z.boolean().optional(),
  verificationStatus: z.enum(["pending", "verified", "rejected"]).optional(),
  verification_status: z.enum(["pending", "verified", "rejected"]).optional(),
  isFeatured: z.boolean().optional(),
  is_featured: z.boolean().optional(),
});

export const adminUpdateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "accepted",
    "in_progress",
    "measuring",
    "stitching",
    "ready_for_pickup",
    "shipped",
    "delivered",
    "completed",
    "cancelled",
    "disputed",
  ]),
  notes: z.string().max(1000).optional(),
});

export const adminProcessPayoutSchema = z.object({
  status: z.enum(["pending", "processing", "paid", "rejected"]).optional(),
  action: z.enum(["approve", "paid", "complete", "reject", "processing"]).optional(),
  reference: z.string().max(120).optional(),
  adminNotes: z.string().max(500).optional(),
  admin_notes: z.string().max(500).optional(),
});

export const adminRefundPaymentSchema = z
  .object({
    paymentId: z.string().optional(),
    payment_id: z.string().optional(),
    orderId: z.string().optional(),
    order_id: z.string().optional(),
    amount: z.coerce.number().positive().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((d) => Boolean(d.paymentId || d.payment_id || d.orderId || d.order_id), {
    message: "paymentId or orderId is required to issue a refund",
  });

export const createDisputeSchema = z.object({
  reason: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  evidenceUrls: z.array(z.string().url()).optional(),
  evidence_urls: z.array(z.string().url()).optional(),
});

export const resolveDisputeSchema = z.object({
  status: z.enum(["under_review", "resolved", "rejected", "closed"]).default("resolved"),
  resolution: z.string().trim().min(2).max(2000),
  refundAmount: z.coerce.number().min(0).optional(),
  issueRefund: z.boolean().optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(["approved", "flagged", "hidden"]).optional(),
  action: z.enum(["approve", "flag", "hide", "delete"]).optional(),
  reason: z.string().trim().max(500).optional(),
});
