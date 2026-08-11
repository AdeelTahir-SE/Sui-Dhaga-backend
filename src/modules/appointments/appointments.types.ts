export interface CreateAppointmentPayload {
  tailorId: string;
  serviceId?: string;
  date: string;
  time: string;
  notes?: string;
}

export interface UpdateAppointmentStatusPayload {
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

export interface RescheduleAppointmentPayload {
  date: string;
  time: string;
}
