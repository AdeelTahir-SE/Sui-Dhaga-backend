import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NORMAL_PLAN_ALIASES = new Set(["normal", "free", "default", "starter", "basic"]);

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

const isUuid = (value: unknown): boolean => UUID_PATTERN.test(String(value || "").trim());

const resolveNormalPlan = (plans: any[]) => {
  const freePlan =
    plans.find(
      (p) =>
        ["customer-free", "normal", "free"].includes(String(p.slug || "").toLowerCase()) &&
        Number(p.price_monthly ?? 0) === 0
    ) ||
    plans.find((p) => Number(p.price_monthly ?? 0) === 0 && Number(p.price_yearly ?? 0) === 0);

  return freePlan || plans[0] || FALLBACK_SUBSCRIPTION_PLANS[0];
};

const findPlanByIdentifier = (plans: any[], identifier: string) => {
  const trimmed = identifier.trim();
  const normalized = trimmed.toLowerCase();

  const exactMatch = plans.find(
    (p) => String(p.id) === trimmed || String(p.slug || "").toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  if (NORMAL_PLAN_ALIASES.has(normalized)) {
    return resolveNormalPlan(plans);
  }

  return plans.find((p) => {
    const nameLower = String(p.name || "").toLowerCase();
    return nameLower === normalized || nameLower.replace(/\s+/g, "-") === normalized;
  });
};

const buildDefaultSubscriptionFallback = (userId: string, plan: any) => ({
  id: null,
  user_id: userId,
  plan_id: plan.id,
  billing_cycle: "monthly",
  status: "active",
  provider: "free",
  amount: 0,
  currency: String(plan.currency || "PKR"),
  current_period_start: new Date().toISOString(),
  current_period_end: null,
  cancel_at_period_end: false,
  is_default: true,
  plan,
});

/**
 * Deactivates any currently active subscriptions for the user and inserts the
 * newly activated subscription row directly into `user_subscriptions`.
 */
async function activateSubscriptionRow(
  client: ReturnType<typeof getDbClient>,
  params: {
    userId: string;
    plan: any;
    billingCycle: "monthly" | "yearly";
    provider: string;
    amount: number;
  }
) {
  const { userId, plan, billingCycle, provider, amount } = params;
  const now = new Date();
  const periodDays = billingCycle === "yearly" ? 365 : 30;
  const currentPeriodEnd =
    amount === 0 ? null : new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000).toISOString();
  const currency = String(plan.currency || "PKR");

  // Expire prior active rows using a status allowed by the DB CHECK constraint
  const { error: deactivateError } = await client
    .from("user_subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active");

  if (deactivateError) {
    throwDbError(deactivateError, "user_subscriptions");
  }

  const { data: created, error } = await client
    .from("user_subscriptions")
    .insert({
      user_id: userId,
      plan_id: plan.id,
      billing_cycle: billingCycle,
      status: "active",
      provider,
      amount,
      currency,
      current_period_start: now.toISOString(),
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: false,
    })
    .select("*, plan:subscription_plans(*)")
    .single();

  if (error) {
    throwDbError(error, "user_subscriptions");
  }

  return created?.plan ? created : { ...created, plan };
}

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

  /**
   * Ensures a user always has an active subscription, provisioning the default
   * normal (free) plan in `user_subscriptions` if none is currently active.
   */
  async ensureDefaultSubscription(userId: string) {
    if (!userId) return null;
    const client = getDbClient();

    const { data: existing, error } = await client
      .from("user_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isMissingTableError(error)) {
      throw new AppError(error.message, 400);
    }

    if (existing) {
      const periodEndMs = existing.current_period_end
        ? new Date(existing.current_period_end).getTime()
        : null;
      if (!periodEndMs || periodEndMs > Date.now()) {
        return existing;
      }

      // Expired paid period: transition row to expired before falling back to normal plan
      await client
        .from("user_subscriptions")
        .update({ status: "expired" })
        .eq("id", existing.id);
    }

    const plans = await this.getPlans();
    const normalPlan = resolveNormalPlan(plans);

    if (error || !isUuid(normalPlan.id)) {
      return buildDefaultSubscriptionFallback(userId, normalPlan);
    }

    try {
      return await activateSubscriptionRow(client, {
        userId,
        plan: normalPlan,
        billingCycle: "monthly",
        provider: "free",
        amount: 0,
      });
    } catch {
      return buildDefaultSubscriptionFallback(userId, normalPlan);
    }
  },

  async getMySubscription(userId: string) {
    if (!userId) throw new AppError("Authentication required", 401);
    return this.ensureDefaultSubscription(userId);
  },

  /**
   * Activates the requested subscription plan directly in `user_subscriptions`
   * without running external payment verification.
   */
  async checkoutSubscription(userId: string, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const planIdentifier = String(
      data.planId || data.plan_id || data.planSlug || data.plan_slug || ""
    ).trim();
    const billingCycle = (data.billingCycle || data.billing_cycle || "monthly") as "monthly" | "yearly";

    const plans = await this.getPlans();
    const matchedPlan = findPlanByIdentifier(plans, planIdentifier);

    if (!matchedPlan) {
      throw new AppError("Subscription plan not found", 404);
    }

    const amount =
      billingCycle === "yearly"
        ? Number((matchedPlan as any).price_yearly ?? 0)
        : Number((matchedPlan as any).price_monthly ?? 0);
    const currency = String((matchedPlan as any).currency || "PKR");
    const provider = String(data.provider || (amount === 0 ? "free" : "direct"));

    const client = getDbClient();
    const created = await activateSubscriptionRow(client, {
      userId,
      plan: matchedPlan,
      billingCycle,
      provider,
      amount,
    });

    return {
      subscription: created,
      plan: matchedPlan,
      amount,
      currency,
      status: "active",
      checkoutUrl: null,
    };
  },

  async cancelSubscription(userId: string) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    const { data: active, error: findError } = await client
      .from("user_subscriptions")
      .select("id, amount")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) throwDbError(findError, "user_subscriptions");
    if (!active || Number(active.amount ?? 0) <= 0) {
      throw new AppError("No active paid subscription found", 404);
    }

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
