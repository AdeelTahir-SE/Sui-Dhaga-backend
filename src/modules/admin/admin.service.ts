import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { cacheService } from "../../services/cache.service.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingColumnError, isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

const DEFAULT_CMS_SECTIONS = [
  {
    section_key: "hero",
    title: "Bespoke Tailoring Meets AI Design",
    content: {
      headline: "Craft Custom Pakistani Attire With Master Ateliers",
      subheadline:
        "Design your outfit with AI, capture precision measurements, and collaborate with verified tailors across Pakistan.",
      ctaText: "Start Designing",
    },
    is_published: true,
  },
  {
    section_key: "about",
    title: "About Sui-Dhaga",
    content: {
      mission:
        "Connecting discerning customers with artisan tailors and bridal studios through digital tech packs and transparent order tracking.",
    },
    is_published: true,
  },
  {
    section_key: "faq",
    title: "Frequently Asked Questions",
    content: {
      items: [
        {
          question: "How do digital measurements work?",
          answer:
            "Follow our guided measurement tool or share measurements from a previous garment inside your profile.",
        },
        {
          question: "How does escrow & milestone payment work?",
          answer:
            "Payments are held securely and released once your custom garment is stitched and delivered.",
        },
      ],
    },
    is_published: true,
  },
];

const DEFAULT_PLATFORM_SETTINGS: Record<string, unknown> = {
  platform_commission_percent: 10,
  min_payout_amount: 1000,
  support_email: "support@suidhaga.pk",
  support_phone: "+92-300-0000000",
  maintenance_mode: false,
  ai_daily_limit: 20,
};

export const adminService = {
  async getDashboardStats() {
    const client = getDbClient();

    const [
      { count: totalUsers },
      { count: totalTailors },
      { count: totalOrders },
      { data: paymentsData },
    ] = await Promise.all([
      client.from("profiles").select("*", { count: "exact", head: true }),
      client.from("tailors").select("*", { count: "exact", head: true }),
      client.from("orders").select("*", { count: "exact", head: true }),
      client.from("payments").select("amount").in("status", ["completed", "succeeded", "paid"]),
    ]);

    const revenue = (paymentsData ?? []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    );

    return {
      totalUsers: totalUsers ?? 0,
      totalTailors: totalTailors ?? 0,
      totalOrders: totalOrders ?? 0,
      revenue,
    };
  },

  async getRevenueAnalytics(period = "30d") {
    const client = getDbClient();
    const days = period === "7d" ? 7 : period === "90d" ? 90 : period === "12m" ? 365 : 30;
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [paymentsRes, ordersRes, payoutsRes] = await Promise.all([
      client
        .from("payments")
        .select("id, amount, currency, provider, status, created_at")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: true }),
      client
        .from("orders")
        .select("id, total_amount, status, created_at")
        .gte("created_at", sinceIso),
      client.from("tailor_payouts").select("amount, status"),
    ]);

    const payments = paymentsRes.data ?? [];
    const orders = ordersRes.data ?? [];
    const paidPayments = payments.filter((p: any) =>
      ["completed", "succeeded", "paid"].includes(String(p.status))
    );

    const totalRevenue = paidPayments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const commissionEarned = Number((totalRevenue * 0.1).toFixed(2));
    const pendingPayoutsTotal =
      payoutsRes.error && isMissingTableError(payoutsRes.error)
        ? 0
        : (payoutsRes.data ?? [])
            .filter((p: any) => p.status === "pending" || p.status === "processing")
            .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const buckets = new Map<string, { revenue: number; ordersCount: number }>();
    const useMonthly = days >= 180;
    for (const p of paidPayments) {
      const d = String(p.created_at || "").slice(0, useMonthly ? 7 : 10);
      if (!d) continue;
      const entry = buckets.get(d) || { revenue: 0, ordersCount: 0 };
      entry.revenue += Number(p.amount || 0);
      buckets.set(d, entry);
    }
    for (const o of orders) {
      const d = String(o.created_at || "").slice(0, useMonthly ? 7 : 10);
      if (!d) continue;
      const entry = buckets.get(d) || { revenue: 0, ordersCount: 0 };
      entry.ordersCount += 1;
      buckets.set(d, entry);
    }

    const byProvider: Record<string, number> = {};
    for (const p of paidPayments) {
      const prov = String(p.provider || "unknown");
      byProvider[prov] = (byProvider[prov] || 0) + Number(p.amount || 0);
    }

    const chart = Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, val]) => ({
        date,
        label: date,
        revenue: Number(val.revenue.toFixed(2)),
        ordersCount: val.ordersCount,
      }));

    return {
      period,
      currency: "PKR",
      totalRevenue: Number(totalRevenue.toFixed(2)),
      commissionEarned,
      pendingPayoutsTotal,
      ordersCount: orders.length,
      byProvider,
      chart,
    };
  },

  async getRecentActivities(limit = 20) {
    const client = getDbClient();
    const [ordersRes, tailorsRes, paymentsRes, disputesRes] = await Promise.all([
      client
        .from("orders")
        .select("id, status, total_amount, created_at, customer:profiles!customer_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(8),
      client
        .from("tailors")
        .select("id, shop_name, verification_status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      client
        .from("payments")
        .select("id, amount, currency, provider, status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      client
        .from("disputes")
        .select("id, order_id, reason, status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const items: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      status?: string;
      entityId: string;
      createdAt: string;
    }> = [];

    for (const o of ordersRes.data ?? []) {
      items.push({
        id: `order-${o.id}`,
        type: "order",
        title: `Order #${String(o.id).slice(0, 8)} (${o.status})`,
        description: `${(o as any).customer?.full_name || "Customer"} placed an order for PKR ${o.total_amount || 0}`,
        status: o.status,
        entityId: o.id,
        createdAt: o.created_at,
      });
    }
    for (const t of tailorsRes.data ?? []) {
      items.push({
        id: `tailor-${t.id}`,
        type: "tailor",
        title: `Tailor application: ${t.shop_name}`,
        description: `Verification status: ${t.verification_status}`,
        status: t.verification_status,
        entityId: t.id,
        createdAt: t.created_at,
      });
    }
    for (const p of paymentsRes.data ?? []) {
      items.push({
        id: `payment-${p.id}`,
        type: "payment",
        title: `Payment (${p.provider}) — ${p.currency || "PKR"} ${p.amount}`,
        description: `Status: ${p.status}`,
        status: p.status,
        entityId: p.id,
        createdAt: p.created_at,
      });
    }
    if (!disputesRes.error) {
      for (const d of disputesRes.data ?? []) {
        items.push({
          id: `dispute-${d.id}`,
          type: "dispute",
          title: `Dispute opened (${d.status})`,
          description: d.reason,
          status: d.status,
          entityId: d.id,
          createdAt: d.created_at,
        });
      }
    }

    return items
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  async getUsers(page = 1, limit = 20) {
    return fetchTableData({
      table: "profiles",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async createUser(data: Record<string, unknown>) {
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const role = (data.role as "customer" | "tailor" | "admin") || "customer";
    const fullName = String(data.fullName || data.full_name || email.split("@")[0]).trim();
    const phone = data.phone ? String(data.phone).trim() : undefined;
    const status = (data.status as string) || "active";

    const client = getDbClient();
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        ...(phone ? { phone } : {}),
      },
    });

    if (authError || !authData?.user) {
      throw new AppError(authError?.message || "Failed to create auth user", 400);
    }

    const userId = authData.user.id;
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: fullName,
          role,
          phone: phone || null,
          status,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (profileError) {
      throw new AppError(profileError.message, 400);
    }

    if (role === "tailor") {
      await client
        .from("tailors")
        .upsert(
          {
            user_id: userId,
            shop_name: String(data.shopName || `${fullName} Atelier`),
            city: String(data.city || "Lahore"),
            verification_status: "verified",
            verified: true,
          },
          { onConflict: "user_id" }
        )
        .then(() => {});
    }

    return {
      ...profile,
      email: authData.user.email,
    };
  },

  async getUserById(userId: string) {
    const client = getDbClient();
    const { data: profile, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 400);
    if (!profile) throw new AppError("User not found", 404);

    const [{ data: tailor }, { count: ordersCount }, { count: paymentsCount }, authRes] =
      await Promise.all([
        client.from("tailors").select("*").eq("user_id", userId).maybeSingle(),
        client.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", userId),
        client.from("payments").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client.auth.admin.getUserById(userId).catch(() => ({ data: { user: null } })),
      ]);

    return {
      ...profile,
      email: (authRes as any)?.data?.user?.email || null,
      tailor: tailor || null,
      ordersCount: ordersCount ?? 0,
      paymentsCount: paymentsCount ?? 0,
    };
  },

  async updateUser(userId: string, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const allowedCols = ["full_name", "role", "status", "phone", "bio", "address", "avatar_url"];
    const payload: Record<string, unknown> = {};
    for (const col of allowedCols) {
      if (col in mapped) payload[col] = mapped[col];
    }

    const { data: updated, error } = await client
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .maybeSingle();

    if (error) throw new AppError(error.message, 400);
    if (!updated) throw new AppError("User not found", 404);

    if (payload.role || payload.full_name) {
      await client.auth.admin
        .updateUserById(userId, {
          user_metadata: {
            ...(payload.role ? { role: payload.role } : {}),
            ...(payload.full_name ? { full_name: payload.full_name } : {}),
          },
        })
        .catch(() => {});
    }

    return updated;
  },

  async deleteUser(userId: string, actingAdminId?: string) {
    if (actingAdminId && actingAdminId === userId) {
      throw new AppError("You cannot delete your own admin account", 400);
    }
    const client = getDbClient();
    const { error: authErr } = await client.auth.admin.deleteUser(userId);
    if (authErr) {
      const { error: profileErr } = await client.from("profiles").delete().eq("id", userId);
      if (profileErr) throw new AppError(profileErr.message, 400);
    }
    return true;
  },

  async setBlockStatus(userId: string, blocked: boolean) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .update({
        status: blocked ? "blocked" : "active",
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  },

  async getTailors(page = 1, limit = 20) {
    return fetchTableData({
      table: "tailors",
      select: "*, profile:profiles(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getTailorById(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .select("*, profile:profiles(*), services:tailor_services(*), gallery:tailor_gallery(*), reviews(*)")
      .eq("id", tailorId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError("Tailor not found", 404);
    return data;
  },

  async updateTailor(tailorId: string, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const allowedCols = [
      "shop_name",
      "city",
      "address",
      "bio",
      "specialties",
      "verified",
      "verification_status",
      "is_featured",
    ];
    const payload: Record<string, unknown> = {};
    for (const col of allowedCols) {
      if (col in mapped) payload[col] = mapped[col];
    }

    if ("verification_status" in payload && !("verified" in payload)) {
      payload.verified = payload.verification_status === "verified";
    }

    let { data: updated, error } = await client
      .from("tailors")
      .update(payload)
      .eq("id", tailorId)
      .select("*, profile:profiles(*)")
      .maybeSingle();

    if (error && isMissingColumnError(error) && "is_featured" in payload) {
      delete payload.is_featured;
      const retry = await client
        .from("tailors")
        .update(payload)
        .eq("id", tailorId)
        .select("*, profile:profiles(*)")
        .maybeSingle();
      updated = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);
    if (!updated) throw new AppError("Tailor not found", 404);

    cacheService.del(`tailor:${tailorId}`);
    cacheService.delByPattern("tailors:*");
    return updated;
  },

  async setTailorVerification(tailorId: string, status: "verified" | "rejected") {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .update({
        verification_status: status,
        verified: status === "verified",
      })
      .eq("id", tailorId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    cacheService.del(`tailor:${tailorId}`);
    cacheService.delByPattern("tailors:*");
    return data;
  },

  async getOrders(page = 1, limit = 20) {
    return fetchTableData({
      table: "orders",
      select: "*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*), service:tailor_services!service_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getOrderById(orderId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("orders")
      .select(
        "*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*, profile:profiles(*)), service:tailor_services!service_id(*), design:designs!design_id(*), payments(*), reviews(*)"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 400);
    if (!data) throw new AppError("Order not found", 404);
    return data;
  },

  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    const client = getDbClient();
    const { data: existing, error: findErr } = await client
      .from("orders")
      .select("id, customer_id, tailor_id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (findErr) throw new AppError(findErr.message, 400);
    if (!existing) throw new AppError("Order not found", 404);

    const updatePayload: Record<string, unknown> = { status };
    if (notes !== undefined) updatePayload.additional_notes = notes;

    const { data: updated, error } = await client
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);

    if (existing.customer_id) {
      await notificationsService
        .createNotification({
          userId: existing.customer_id,
          title: "Order status updated by Admin",
          message: `Order #${orderId.slice(0, 8)} status is now ${status.replace(/_/g, " ")}`,
          type: "order_update",
          data: { orderId, status },
        })
        .catch(() => {});
    }

    return updated;
  },

  async getPayments(page = 1, limit = 20) {
    return fetchTableData({
      table: "payments",
      select: "*, user:profiles!user_id(*), order:orders!order_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getPayouts(status?: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const client = getDbClient();

    let query = client
      .from("tailor_payouts")
      .select(
        "*, tailor:tailors(id, shop_name, city, user_id, profile:profiles(id, full_name, phone))",
        { count: "exact" }
      );

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      if (isMissingTableError(error)) return { records: [], total: 0 };
      throwDbError(error, "tailor_payouts");
    }

    return {
      records: data ?? [],
      total: count ?? 0,
    };
  },

  async processPayout(payoutId: string, adminId: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const { data: payout, error: findError } = await client
      .from("tailor_payouts")
      .select("id, tailor_id, amount, currency, status")
      .eq("id", payoutId)
      .maybeSingle();

    if (findError) throwDbError(findError, "tailor_payouts");
    if (!payout) throw new AppError("Payout request not found", 404);

    let nextStatus = String(data.status || "");
    const action = String(data.action || "");
    if (!nextStatus) {
      if (["approve", "paid", "complete"].includes(action)) nextStatus = "paid";
      else if (action === "reject") nextStatus = "rejected";
      else if (action === "processing") nextStatus = "processing";
      else nextStatus = "paid";
    }

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      reference: data.reference ?? null,
      admin_notes: data.adminNotes || data.admin_notes || null,
      processed_by: adminId || null,
      processed_at: new Date().toISOString(),
    };

    const { data: updated, error } = await client
      .from("tailor_payouts")
      .update(updatePayload)
      .eq("id", payoutId)
      .select()
      .single();

    if (error) throwDbError(error, "tailor_payouts");

    const { data: tailor } = await client
      .from("tailors")
      .select("user_id, shop_name")
      .eq("id", payout.tailor_id)
      .maybeSingle();

    if (tailor?.user_id) {
      await notificationsService
        .createNotification({
          userId: tailor.user_id,
          title: `Payout ${nextStatus}`,
          message: `Your payout request of ${payout.currency || "PKR"} ${payout.amount} has been marked as ${nextStatus}`,
          type: "payout",
          data: { payoutId, status: nextStatus, reference: data.reference || null },
        })
        .catch(() => {});
    }

    return updated;
  },

  async refundPayment(data: Record<string, unknown>) {
    const paymentId = (data.paymentId || data.payment_id) as string | undefined;
    const orderId = (data.orderId || data.order_id) as string | undefined;
    const reason = String(data.reason || "Admin issued refund").trim();

    const client = getDbClient();
    let payment: any = null;
    if (paymentId) {
      const res = await client.from("payments").select("*").eq("id", paymentId).maybeSingle();
      if (res.error) throw new AppError(res.error.message, 400);
      payment = res.data;
    } else if (orderId) {
      const res = await client
        .from("payments")
        .select("*")
        .eq("order_id", orderId)
        .in("status", ["completed", "succeeded", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (res.error) throw new AppError(res.error.message, 400);
      payment = res.data;
    }

    if (!payment) throw new AppError("Matching payment record not found for refund", 404);

    const fullAmount = Number(payment.amount || 0);
    const refundAmount = data.amount !== undefined ? Number(data.amount) : fullAmount;
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > fullAmount) {
      throw new AppError(`Refund amount must be between 0 and ${fullAmount}`, 400);
    }

    let { data: updated, error } = await client
      .from("payments")
      .update({
        status: "refunded",
        refund_amount: refundAmount,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", payment.id)
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      const retry = await client
        .from("payments")
        .update({ status: "refunded" })
        .eq("id", payment.id)
        .select()
        .single();
      updated = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);

    if (payment.order_id) {
      await client
        .from("orders")
        .update({ payment_status: "refunded" })
        .eq("id", payment.order_id)
        .then(() => {});
    }

    if (payment.user_id) {
      await notificationsService
        .createNotification({
          userId: payment.user_id,
          title: "Payment refunded",
          message: `A refund of ${payment.currency || "PKR"} ${refundAmount} has been processed (${reason})`,
          type: "refund",
          data: { paymentId: payment.id, orderId: payment.order_id, refundAmount },
        })
        .catch(() => {});
    }

    return updated;
  },

  async createDispute(orderId: string, userId: string, data: Record<string, unknown>) {
    const client = getDbClient();
    const { data: order, error: orderErr } = await client
      .from("orders")
      .select("id, customer_id, tailor_id")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) throw new AppError(orderErr.message, 400);
    if (!order) throw new AppError("Order not found", 404);

    if (order.customer_id !== userId) {
      const { data: tailor } = await client
        .from("tailors")
        .select("user_id")
        .eq("id", order.tailor_id)
        .maybeSingle();
      if (!tailor || tailor.user_id !== userId) {
        throw new AppError("You do not have permission to open a dispute for this order", 403);
      }
    }

    const evidenceUrls = (data.evidenceUrls || data.evidence_urls || []) as string[];
    const { data: created, error } = await client
      .from("disputes")
      .insert({
        order_id: orderId,
        raised_by: userId,
        reason: String(data.reason || "").trim(),
        description: data.description ? String(data.description).trim() : null,
        evidence_urls: evidenceUrls,
        status: "open",
      })
      .select()
      .single();

    if (error) throwDbError(error, "disputes");
    await client.from("orders").update({ status: "disputed" }).eq("id", orderId).then(() => {});
    return created;
  },

  async getDisputes(status?: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const client = getDbClient();

    let query = client
      .from("disputes")
      .select(
        "*, order:orders(id, status, total_amount, customer_id, tailor_id), raiser:profiles!raised_by(id, full_name, avatar_url, role)",
        { count: "exact" }
      );

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      if (isMissingTableError(error)) return { records: [], total: 0 };
      throwDbError(error, "disputes");
    }

    return {
      records: data ?? [],
      total: count ?? 0,
    };
  },

  async resolveDispute(disputeId: string, adminId: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const { data: dispute, error: findErr } = await client
      .from("disputes")
      .select("id, order_id, raised_by, status")
      .eq("id", disputeId)
      .maybeSingle();

    if (findErr) throwDbError(findErr, "disputes");
    if (!dispute) throw new AppError("Dispute not found", 404);

    const status = String(data.status || "resolved");
    const resolution = String(data.resolution || "").trim();

    const { data: updated, error } = await client
      .from("disputes")
      .update({
        status,
        resolution,
        resolved_by: adminId || null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (error) throwDbError(error, "disputes");

    if (dispute.order_id && (data.issueRefund || (data.refundAmount && Number(data.refundAmount) > 0))) {
      await this.refundPayment({
        orderId: dispute.order_id,
        amount: data.refundAmount ? Number(data.refundAmount) : undefined,
        reason: resolution || "Dispute resolution refund",
      }).catch(() => {});
    }

    if (dispute.raised_by) {
      await notificationsService
        .createNotification({
          userId: dispute.raised_by,
          title: `Dispute ${status}`,
          message: resolution || `Your order dispute has been marked ${status}`,
          type: "dispute",
          data: { disputeId, orderId: dispute.order_id, status },
        })
        .catch(() => {});
    }

    return updated;
  },

  async getReviews(status?: string, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const client = getDbClient();

    let query = client
      .from("reviews")
      .select(
        "*, customer:profiles!customer_id(id, full_name, avatar_url), tailor:tailors!tailor_id(id, shop_name, city)",
        { count: "exact" }
      );

    if (status && status !== "all") {
      query = query.eq("moderation_status", status);
    }

    let { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error && isMissingColumnError(error)) {
      const retry = await client
        .from("reviews")
        .select(
          "id, order_id, tailor_id, customer_id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url), tailor:tailors!tailor_id(id, shop_name, city)",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);
      data = retry.data as any;
      count = retry.count;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);
    return {
      records: data ?? [],
      total: count ?? 0,
    };
  },

  async moderateReview(reviewId: string, data: Record<string, unknown>) {
    const client = getDbClient();
    const { data: review, error: findErr } = await client
      .from("reviews")
      .select("id, tailor_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (findErr) throw new AppError(findErr.message, 400);
    if (!review) throw new AppError("Review not found", 404);

    if (data.action === "delete") {
      const { error: delErr } = await client.from("reviews").delete().eq("id", reviewId);
      if (delErr) throw new AppError(delErr.message, 400);
      if (review.tailor_id) {
        cacheService.del(`tailor:${review.tailor_id}`);
        cacheService.delByPattern("tailors:*");
      }
      return { id: reviewId, deleted: true };
    }

    let moderationStatus = String(data.status || "");
    if (!moderationStatus) {
      if (data.action === "hide") moderationStatus = "hidden";
      else if (data.action === "flag") moderationStatus = "flagged";
      else moderationStatus = "approved";
    }

    const { data: updated, error } = await client
      .from("reviews")
      .update({
        moderation_status: moderationStatus,
        moderation_reason: data.reason ? String(data.reason).trim() : null,
      })
      .eq("id", reviewId)
      .select()
      .single();

    if (error) throwDbError(error, "reviews");
    if (review.tailor_id) {
      cacheService.del(`tailor:${review.tailor_id}`);
      cacheService.delByPattern("tailors:*");
    }
    return updated;
  },

  async getCmsContent(sectionKey?: string) {
    const client = getDbClient();
    let query = client.from("cms_content").select("*").order("section_key", { ascending: true });
    if (sectionKey) {
      query = query.eq("section_key", sectionKey);
    }

    const { data, error } = await query;
    if (error) {
      if (isMissingTableError(error)) {
        const list = sectionKey
          ? DEFAULT_CMS_SECTIONS.filter((s) => s.section_key === sectionKey)
          : DEFAULT_CMS_SECTIONS;
        return sectionKey ? list[0] ?? null : list;
      }
      throw new AppError(error.message, 400);
    }

    const rows = data && data.length > 0 ? data : DEFAULT_CMS_SECTIONS;
    if (sectionKey) {
      return rows.find((r: any) => r.section_key === sectionKey) || null;
    }
    return rows;
  },

  async updateCmsContent(adminId: string | undefined, payload: Record<string, unknown>) {
    const client = getDbClient();
    const sectionsInput: any[] = Array.isArray(payload.sections)
      ? payload.sections
      : payload.sectionKey || payload.section_key
        ? [payload]
        : Object.entries(payload).map(([k, v]) => ({
            section_key: k,
            title: (v as any)?.title || k,
            content: (v as any)?.content ?? v,
            is_published: (v as any)?.isPublished ?? true,
          }));

    if (sectionsInput.length === 0) {
      throw new AppError("CMS section payload cannot be empty", 400);
    }

    const rows = sectionsInput.map((item) => ({
      section_key: String(item.sectionKey || item.section_key),
      title: item.title ? String(item.title) : null,
      content: item.content ?? {},
      is_published: item.isPublished ?? item.is_published ?? true,
      updated_by: adminId || null,
    }));

    const { data, error } = await client
      .from("cms_content")
      .upsert(rows, { onConflict: "section_key" })
      .select();

    if (error) throwDbError(error, "cms_content");
    return data ?? [];
  },

  async getPlatformSettings() {
    const client = getDbClient();
    const { data, error } = await client.from("platform_settings").select("*");
    if (error) {
      if (isMissingTableError(error)) {
        return { ...DEFAULT_PLATFORM_SETTINGS };
      }
      throw new AppError(error.message, 400);
    }

    const result: Record<string, unknown> = { ...DEFAULT_PLATFORM_SETTINGS };
    for (const row of data ?? []) {
      result[row.setting_key] = row.setting_value;
    }
    return result;
  },

  async updatePlatformSettings(adminId: string | undefined, payload: Record<string, unknown>) {
    const client = getDbClient();
    const source =
      payload.settings && typeof payload.settings === "object" && !Array.isArray(payload.settings)
        ? (payload.settings as Record<string, unknown>)
        : payload;

    const entries = Object.entries(source).filter(([k]) => k !== "settings");
    if (entries.length === 0) {
      throw new AppError("At least one setting key-value pair is required", 400);
    }

    const rows = entries.map(([setting_key, setting_value]) => ({
      setting_key,
      setting_value,
      updated_by: adminId || null,
    }));

    const { error } = await client
      .from("platform_settings")
      .upsert(rows, { onConflict: "setting_key" });

    if (error) throwDbError(error, "platform_settings");
    return this.getPlatformSettings();
  },

  async getReports(page = 1, limit = 20) {
    return fetchTableData({
      table: "reports",
      select: "*, reporter:profiles!reporter_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async deleteCommunityPost(postId: string) {
    return deleteTableData({
      table: "community_posts",
      id: postId,
    });
  },
};
