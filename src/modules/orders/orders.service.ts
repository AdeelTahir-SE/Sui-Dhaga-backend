import {
  getDbClient,
  toSnakeCase,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

function formatOrderRecord(order: any) {
  if (!order) return order;
  const price = Number(order.total_amount ?? order.totalAmount ?? order.price ?? order.amount ?? 0);
  const rawDesignImages = order.design_images ?? order.designImages ?? (order.design?.images ? order.design.images : []);
  const designImages = Array.isArray(rawDesignImages) ? rawDesignImages : [];
  const firstDesignImg =
    (designImages.length > 0 ? designImages[0] : null) ??
    order.design?.image_url ??
    order.design?.image ??
    order.imageUrl ??
    order.image ??
    null;

  return {
    ...order,
    total_amount: price,
    totalAmount: price,
    price,
    amount: price,
    itemName: order.item_name ?? order.itemName ?? null,
    item_name: order.item_name ?? order.itemName ?? null,
    designImages,
    design_images: designImages,
    imageUrl: firstDesignImg,
    image: firstDesignImg,
    additionalNotes: order.additional_notes ?? order.additionalNotes ?? null,
    additional_notes: order.additional_notes ?? order.additionalNotes ?? null,
    deliveryDate: order.delivery_date ?? order.deliveryDate ?? null,
    delivery_date: order.delivery_date ?? order.deliveryDate ?? null,
    measurements: order.measurements ?? {},
  };
}

export const ordersService = {
  async getOrders(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    let query = client
      .from("orders")
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*), service:tailor_services!service_id(*), design:designs!design_id(*), measurement:measurements!measurement_id(*)", { count: "exact" });

    if (userId && userRole !== "admin") {
      if (userRole === "tailor") {
        const { data: tailor } = await client.from("tailors").select("id").eq("user_id", userId).maybeSingle();
        if (tailor?.id) {
          query = query.eq("tailor_id", tailor.id);
        } else {
          query = query.eq("tailor_id", userId);
        }
      } else {
        query = query.eq("customer_id", userId);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((p - 1) * l, p * l - 1);

    if (error) throw new AppError(error.message, 400);

    const formatted = (data ?? []).map(formatOrderRecord);

    return {
      records: formatted,
      page: p,
      limit: l,
      total: count ?? 0,
      singleRecord: null,
    };
  },

  async getOrderById(orderId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("orders")
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*), service:tailor_services!service_id(*), design:designs!design_id(*), measurement:measurements!measurement_id(*), tracking:order_tracking(*)")
      .eq("id", orderId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return formatOrderRecord(data);
  },

  async createOrder(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    const rawTailorId = (data.tailorId ?? data.tailor_id) as string;
    if (!rawTailorId) throw new AppError("tailorId is required", 400);

    // Resolve tailor id in case tailor's user_id or profile id was passed
    let tailorId = rawTailorId;
    try {
      const { data: tailorRec } = await client
        .from("tailors")
        .select("id")
        .or(`id.eq.${rawTailorId},user_id.eq.${rawTailorId}`)
        .maybeSingle();
      if (tailorRec?.id) {
        tailorId = tailorRec.id;
      }
    } catch {}

    const totalAmount = Number(data.totalAmount ?? data.total_amount ?? data.price ?? data.amount ?? 0);
    const itemName = (data.itemName ?? data.item_name) as string | undefined;
    const notes = (data.notes as string | undefined) ?? null;
    const additionalNotes = (data.additionalNotes ?? data.additional_notes) as string | undefined ?? null;
    const deliveryDate = (data.deliveryDate ?? data.delivery_date) as string | undefined ?? null;
    const designImages = (data.designImages ?? data.design_images ?? []) as string[];
    const measurements = (data.measurements ?? {}) as Record<string, unknown>;
    const serviceId = (data.serviceId ?? data.service_id) as string | undefined;
    const designId = (data.designId ?? data.design_id) as string | undefined;
    const measurementId = (data.measurementId ?? data.measurement_id ?? data.measurementsId) as string | undefined;

    const payload: Record<string, unknown> = {
      customer_id: userId,
      tailor_id: tailorId,
      total_amount: totalAmount,
      notes,
      additional_notes: additionalNotes,
      item_name: itemName ?? null,
      design_images: Array.isArray(designImages) ? designImages : [],
      measurements: measurements && typeof measurements === "object" ? measurements : {},
      delivery_date: deliveryDate,
      status: "pending",
    };

    if (serviceId && typeof serviceId === "string" && serviceId.trim()) payload.service_id = serviceId;
    if (designId && typeof designId === "string" && designId.trim()) payload.design_id = designId;
    if (measurementId && typeof measurementId === "string" && measurementId.trim()) payload.measurement_id = measurementId;

    const { data: created, error } = await client
      .from("orders")
      .insert(payload)
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return formatOrderRecord(created);
  },

  async updateOrderStatus(orderId: string, _userId: string | undefined, _userRole: string | undefined, status: string) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("orders")
      .update({ status })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async cancelOrder(orderId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async getOrderInvoice(orderId: string, userId: string | undefined, userRole: string | undefined) {
    const order = await this.getOrderById(orderId, userId, userRole);
    return {
      invoiceId: `INV-${orderId.substring(0, 8).toUpperCase()}`,
      order,
      generatedAt: new Date().toISOString(),
    };
  },

  async getOrderTracking(orderId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("order_tracking")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addOrderTracking(orderId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("order_tracking")
      .insert({
        ...mapped,
        order_id: orderId,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateOrderTracking(trackingId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("order_tracking")
      .update(mapped)
      .eq("id", trackingId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },
};

