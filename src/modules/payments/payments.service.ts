import {
  getDbClient,
  fetchTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingColumnError } from "../../utils/supabase-error.js";
import { paymentService, type SupportedPaymentProvider } from "../../services/payment.service.js";
import { couponsService } from "../coupons/coupons.service.js";

export const paymentsService = {
  async createCheckout(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    const orderId = String(data.orderId || data.order_id || "").trim();
    if (!orderId) throw new AppError("orderId is required", 400);

    const { data: order, error: orderError } = await client
      .from("orders")
      .select("id, customer_id, tailor_id, total_amount, status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw new AppError(orderError.message, 400);
    if (!order) throw new AppError("Order not found", 404);
    if (userRole !== "admin" && order.customer_id !== userId) {
      throw new AppError("You do not have permission to pay for this order", 403);
    }

    const provider = String(data.provider || "safepay") as SupportedPaymentProvider;
    const currency = String(data.currency || "PKR").toUpperCase();
    const baseAmount = Number(data.amount ?? order.total_amount ?? 0);
    if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
      throw new AppError("Valid positive checkout amount is required", 400);
    }

    const couponCode = String(data.couponCode || data.coupon_code || "").trim().toUpperCase();
    let discountAmount = 0;
    let finalAmount = baseAmount;
    if (couponCode) {
      const couponResult = await couponsService.validateCoupon({
        code: couponCode,
        orderAmount: baseAmount,
        userId,
      });
      discountAmount = couponResult.discountAmount;
      finalAmount = couponResult.finalAmount;
    }

    const session = await paymentService.createCheckoutSession({
      amount: finalAmount,
      currency,
      orderId,
      provider,
    });

    const isCod = provider === "cod";
    const fullInsertPayload: Record<string, unknown> = {
      order_id: orderId,
      user_id: userId,
      amount: finalAmount,
      currency,
      provider,
      status: isCod ? "pending" : "pending_checkout",
      transaction_id: session.sessionId,
      coupon_code: couponCode || null,
      discount_amount: discountAmount,
      payment_method_id: data.paymentMethodId || data.payment_method_id || null,
      checkout_url: session.checkoutUrl,
    };

    let { data: created, error } = await client
      .from("payments")
      .insert(fullInsertPayload)
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      const { data: retry, error: retryErr } = await client
        .from("payments")
        .insert({
          order_id: orderId,
          user_id: userId,
          amount: finalAmount,
          currency,
          provider: ["stripe", "safepay"].includes(provider) ? provider : "safepay",
          status: isCod ? "pending" : "pending_checkout",
          transaction_id: session.sessionId,
        })
        .select()
        .single();
      created = retry;
      error = retryErr;
    }

    if (error) throw new AppError(error.message, 400);

    if (isCod) {
      await client
        .from("orders")
        .update({ payment_status: "cod_pending" })
        .eq("id", orderId)
        .then(() => {});
    }

    return {
      ...created,
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
      discountAmount,
      finalAmount,
      couponCode: couponCode || null,
    };
  },

  async confirmPayment(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const paymentId = (data.paymentId || data.payment_id) as string;
    const transactionId = (data.transactionId || data.transaction_id) as string;

    const { data: existing, error: findError } = await client
      .from("payments")
      .select("id, user_id, order_id")
      .eq("id", paymentId)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 400);
    if (!existing) throw new AppError("Payment record not found", 404);
    if (userRole !== "admin" && existing.user_id !== userId) {
      throw new AppError("You do not have permission to confirm this payment", 403);
    }

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
      await client
        .from("orders")
        .update({ status: "confirmed", payment_status: "paid" })
        .eq("id", updated.order_id);
    }

    return updated;
  },

  async getPaymentHistory(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    return fetchTableData({
      table: "payments",
      select: "*, order:orders(id, status, total_amount, tailor_id, created_at)",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getPaymentById(paymentId: string, userId: string | undefined, userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("payments")
      .select("*, order:orders(*)")
      .eq("id", paymentId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError("Payment not found", 404);
    if (userId && userRole !== "admin" && data.user_id !== userId) {
      throw new AppError("Access denied to this payment record", 403);
    }
    return data;
  },

  async handleWebhook(data: Record<string, unknown>) {
    const client = getDbClient();
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
