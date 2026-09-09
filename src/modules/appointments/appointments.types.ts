export interface CreateAppointmentPayload {
  tailorId: string;
  serviceId?: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

export interface RescheduleAppointmentPayload {
  appointment_date: string;
  appointment_time: string;
}
