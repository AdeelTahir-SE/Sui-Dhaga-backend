import { z } from "zod";

export const createAppointmentSchema = z
  .object({
    tailorId: z.string().min(1).optional(),
    tailor_id: z.string().min(1).optional(),
    serviceId: z.string().optional(),
    service_id: z.string().optional(),
    appointment_date: z.string().optional(),
    appointmentDate: z.string().optional(),
    date: z.string().optional(),
    appointment_time: z.string().optional(),
    appointmentTime: z.string().optional(),
    time: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "rescheduled", "completed", "cancelled"]),
});

export const rescheduleAppointmentSchema = z
  .object({
    appointment_date: z.string().optional(),
    appointmentDate: z.string().optional(),
    date: z.string().optional(),
    appointment_time: z.string().optional(),
    appointmentTime: z.string().optional(),
    time: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();
