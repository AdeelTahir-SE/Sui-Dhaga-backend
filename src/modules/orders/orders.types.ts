export interface CreateOrderPayload {
  tailorId: string;
  serviceId: string;
  designId?: string;
  measurementId?: string;
  notes?: string;
  amount?: number;
}

export interface UpdateOrderStatusPayload {
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
}

export interface AddOrderTrackingPayload {
  status: string;
  description?: string;
  location?: string;
}

export interface UpdateOrderTrackingPayload {
  status?: string;
  description?: string;
  location?: string;
}
