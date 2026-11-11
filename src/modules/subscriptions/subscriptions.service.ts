import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";
import { paymentService, type SupportedPaymentProvider } from "../../services/payment.service.js";

const FALLBACK_SUBSCRIPTION_PLANS = [
  {
    id: "plan-customer-free",
    slug: "customer-free",
    name: "Essential",
    target_role: "customer",
    price_monthly: 0,
    price_yearly: 0,
    currency: "PKR",
    description: "Explore tailors, create AI sketches, and book custom fittings.",
    features: [
      "Up to 5 AI Outfit Generations / month",
      "Standard measurement profile storage",
      "Direct messaging with verified tailors",
    ],
    is_popular: false,
    sort_order: 1,
  },
  {
    id: "plan-atelier-plus",
    slug: "atelier-plus",
    name: "Atelier Plus",
    target_role: "tailor",
    price_monthly: 2900,
    price_yearly: 29000,
    currency: "PKR",
    description: "Boosted marketplace visibility, verified badge priority, and analytics.",
    features: [
      "Verified Atelier Badge",
      "Featured placement in city searches",
      "Unlimited gallery & lookbook uploads",
      "Reduced 7% platform commission",
    ],
    is_popular: true,
    sort_order: 2,
  },
  {
    id: "plan-bridal-vip",
    slug: "bridal-vip",
    name: "Couture VIP",
    target_role: "customer",
    price_monthly: 1490,
    price_yearly: 14900,
    currency: "PKR",
    description: "Unlimited AI tech packs, bridal concierge support, and zero booking fees.",
    features: [
      "Unlimited AI Design Studio & Tech Pack PDF exports",
      "Priority virtual appointments",
      "Dedicated bridal alteration protection",
    ],
    is_popular: false,
    sort_order: 3,
  },
];

export const subscriptionsService = {
  async getPlans() {
    const client = getDbClient();
    const { data, error } = await client
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) return FALLBACK_SUBSCRIPTION_PLANS;
      throw new AppError(error.message, 400);
    }

    return data && data.length > 0 ? data : FALLBACK_SUBSCRIPTION_PLANS;
  },

  async getMySubscription(userId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("user_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return null;
      throw new AppError(error.message, 400);
    }

    return data ?? null;
  },

  async checkoutSubscription(userId: string, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const planIdentifier = String(
      data.planId || data.plan_id || data.planSlug || data.plan_slug || ""
    ).trim();
    const billingCycle = (data.billingCycle || data.billing_cycle || "monthly") as "monthly" | "yearly";
    const provider = String(data.provider || "safepay") as SupportedPaymentProvider;

    const plans = await this.getPlans();
    const matchedPlan = plans.find(
      (p: any) =>
        p.id === planIdentifier ||
        String(p.slug).toLowerCase() === planIdentifier.toLowerCase()
    );

    if (!matchedPlan) {
      throw new AppError("Subscription plan not found", 404);
    }

    const amount =
      billingCycle === "yearly"
        ? Number((matchedPlan as any).price_yearly ?? 0)
        : Number((matchedPlan as any).price_monthly ?? 0);

    const periodDays = billingCycle === "yearly" ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    const session =
      amount > 0
        ? await paymentService.createCheckoutSession({
            amount,
            currency: (matchedPlan as any).currency || "PKR",
            orderId: `sub-${matchedPlan.id}-${Date.now()}`,
            provider,
          })
        : { checkoutUrl: null, sessionId: `free-${Date.now()}` };

    const client = getDbClient();
    // Deactivate prior active subscriptions before inserting new active one
    await client
      .from("user_subscriptions")
      .update({ status: "superseded" })
      .eq("user_id", userId)
      .eq("status", "active");

    const { data: created, error } = await client
      .from("user_subscriptions")
      .insert({
        user_id: userId,
        plan_id: matchedPlan.id,
        status: amount === 0 ? "active" : "active",
        billing_cycle: billingCycle,
        provider,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_reference: session.sessionId,
      })
      .select("*, plan:subscription_plans(*)")
      .single();

    if (error) {
      throwDbError(error, "user_subscriptions");
    }

    return {
      subscription: created,
      plan: matchedPlan,
      amount,
      currency: (matchedPlan as any).currency || "PKR",
      checkoutUrl: session.checkoutUrl,
      sessionId: session.sessionId,
    };
  },

  async cancelSubscription(userId: string) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    const { data: active, error: findError } = await client
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) throwDbError(findError, "user_subscriptions");
    if (!active) throw new AppError("No active subscription found", 404);

    const { data: updated, error } = await client
      .from("user_subscriptions")
      .update({ status: "cancelled", cancel_at_period_end: true })
      .eq("id", active.id)
      .select()
      .single();

    if (error) throwDbError(error, "user_subscriptions");
    return updated;
  },
};
