import { z } from "zod";

export const createOrderSchema = z.object({
  tailorId: z.string().min(1),
  serviceId: z.string().min(1),
  designId: z.string().optional(),
  measurementId: z.string().optional(),
  notes: z.string().optional(),
  amount: z.number().positive().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
});

export const addOrderTrackingSchema = z.object({
  status: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
});

export const updateOrderTrackingSchema = addOrderTrackingSchema.partial();
