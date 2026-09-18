export interface CreateOrderPayload {
  tailorId: string;
  serviceId?: string;
  designId?: string;
  measurementId?: string;
  measurementsId?: string;
  itemName?: string;
  item_name?: string;
  measurements?: Record<string, unknown>;
  designImages?: string[];
  design_images?: string[];
  notes?: string;
  additionalNotes?: string;
  additional_notes?: string;
  totalAmount?: number;
  total_amount?: number;
  amount?: number;
  price?: number;
  deliveryDate?: string;
  delivery_date?: string;
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
