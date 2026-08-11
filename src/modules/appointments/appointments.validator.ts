import { z } from "zod";

export const createAppointmentSchema = z.object({
  tailorId: z.string().min(1),
  serviceId: z.string().optional(),
  date: z.string().min(1),
  time: z.string().min(1),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

export const rescheduleAppointmentSchema = z.object({
  date: z.string().min(1),
  time: z.string().min(1),
});
