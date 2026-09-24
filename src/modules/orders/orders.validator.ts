import { z } from "zod";

export const createOrderSchema = z.object({
  tailorId: z.string().min(1),
  serviceId: z.string().optional(),
  designId: z.string().optional(),
  measurementId: z.string().optional(),
  measurementsId: z.string().optional(),
  itemName: z.string().optional(),
  item_name: z.string().optional(),
  measurements: z.record(z.unknown()).optional(),
  designImages: z.array(z.string()).optional(),
  design_images: z.array(z.string()).optional(),
  notes: z.string().optional(),
  additionalNotes: z.string().optional(),
  additional_notes: z.string().optional(),
  totalAmount: z.number().nonnegative().optional(),
  total_amount: z.number().nonnegative().optional(),
  amount: z.number().nonnegative().optional(),
  price: z.number().nonnegative().optional(),
  deliveryDate: z.string().optional(),
  delivery_date: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.preprocess((val) => {
    if (typeof val === "string") {
      const s = val.trim().toLowerCase().replace(/\s+/g, "_");
      if (s === "accepted") return "in_progress";
      if (s === "declined" || s === "rejected") return "cancelled";
      return s;
    }
    return val;
  }, z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"])),
});

export const addOrderTrackingSchema = z.object({
  status: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
});

export const updateOrderTrackingSchema = addOrderTrackingSchema.partial();
