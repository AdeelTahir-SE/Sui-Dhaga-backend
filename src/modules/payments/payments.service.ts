import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const paymentsService = {
  async createCheckout(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("payments")
      .insert({
        ...mapped,
        user_id: userId,
        status: "pending_checkout",
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async confirmPayment(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const paymentId = (data.paymentId || data.payment_id) as string;
    const transactionId = (data.transactionId || data.transaction_id) as string;

    const { data: updated, error } = await client
      .from("payments")
      .update({
        status: "completed",
        transaction_id: transactionId,
      })
      .eq("id", paymentId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    if (updated?.order_id) {
      await client.from("orders").update({ status: "confirmed" }).eq("id", updated.order_id);
    }

    return updated;
  },

  async getPaymentHistory(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    return fetchTableData({
      table: "payments",
      select: "*, order:orders(*)",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getPaymentById(paymentId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("payments")
      .select("*, order:orders(*)")
      .eq("id", paymentId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async handleWebhook(data: Record<string, unknown>) {
    const client = getDbClient();
    const eventType = data.type || data.event;
    const paymentIntent = (data.data as Record<string, unknown>)?.object as Record<string, unknown> | undefined;

    const { data: created, error } = await client
      .from("payments")
      .insert({
        amount: Number(paymentIntent?.amount ?? 0) / 100,
        currency: (paymentIntent?.currency as string) || "PKR",
        provider: "stripe",
        status: "succeeded",
        transaction_id: (paymentIntent?.id as string) || `WH-${Date.now()}`,
        webhook_data: data,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },
};

