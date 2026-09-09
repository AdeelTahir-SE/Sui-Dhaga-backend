import { z } from "zod";

export const createAppointmentSchema = z.object({
  tailorId: z.string().min(1),
  serviceId: z.string().optional(),
  appointment_date: z.string().min(1),
  appointment_time: z.string().min(1),
  notes: z.string().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

export const rescheduleAppointmentSchema = z.object({
  appointment_date: z.string().min(1),
  appointment_time: z.string().min(1),
});
