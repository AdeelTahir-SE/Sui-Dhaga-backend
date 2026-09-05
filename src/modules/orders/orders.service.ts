import {
  getDbClient,
  toSnakeCase,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

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
        query = query.eq("tailor.user_id", userId);
      } else {
        query = query.eq("customer_id", userId);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((p - 1) * l, p * l - 1);

    if (error) throw new AppError(error.message, 400);

    return {
      records: data ?? [],
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
    return data;
  },

  async createOrder(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("orders")
      .insert({
        ...mapped,
        customer_id: userId,
      })
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
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

