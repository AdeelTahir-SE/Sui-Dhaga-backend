import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(?:011|5)/.test(digits)) return "Discover";
  return "Card";
}

function normalizePaymentMethodPayload(data: Record<string, unknown>, isPartial = false) {
  const payload: Record<string, unknown> = {};

  if (data.type !== undefined) payload.type = data.type;
  else if (!isPartial) payload.type = "card";

  if (data.label !== undefined) payload.label = String(data.label).trim() || null;

  const rawCard = typeof data.cardNumber === "string" ? data.cardNumber.replace(/\D/g, "") : "";
  const explicitLast4 =
    typeof data.last4 === "string" ? data.last4.replace(/\D/g, "").slice(-4) : undefined;
  const accountRaw = String(data.accountNumber ?? data.account_number ?? data.phone ?? "").trim();

  if (rawCard.length >= 4) {
    payload.last4 = rawCard.slice(-4);
    payload.brand = data.brand || detectCardBrand(rawCard);
  } else if (explicitLast4) {
    payload.last4 = explicitLast4;
  } else if (accountRaw.length >= 4 && !payload.last4) {
    payload.last4 = accountRaw.slice(-4);
  }

  if (data.brand !== undefined && !payload.brand) {
    payload.brand = String(data.brand).trim() || null;
  }
  if (data.provider !== undefined) {
    payload.provider = String(data.provider).trim();
  } else if (!isPartial && payload.type) {
    payload.provider = String(payload.type);
  }

  const expMonth = data.expiryMonth ?? data.expiry_month;
  if (expMonth !== undefined) payload.expiry_month = Number(expMonth);

  const expYear = data.expiryYear ?? data.expiry_year;
  if (expYear !== undefined) payload.expiry_year = Number(expYear);

  if (data.phone !== undefined) payload.phone = String(data.phone).trim() || null;

  const holderName = data.holderName ?? data.holder_name;
  if (holderName !== undefined) payload.holder_name = String(holderName).trim() || null;

  const providerToken = data.providerToken ?? data.provider_token;
  if (providerToken !== undefined) payload.provider_token = String(providerToken).trim() || null;

  if (!payload.label && !isPartial) {
    const typeLabel = String(payload.brand || payload.provider || payload.type || "Payment Method");
    payload.label = payload.last4 ? `${typeLabel} •••• ${payload.last4}` : typeLabel;
  }

  const isDefault = data.isDefault ?? data.is_default;
  if (typeof isDefault === "boolean") payload.is_default = isDefault;

  return payload;
}

export const paymentMethodsService = {
  async getMyPaymentMethods(userId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("payment_methods")
      .select("id, user_id, type, provider, label, brand, last4, expiry_month, expiry_year, phone, holder_name, is_default, created_at, updated_at")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throwDbError(error, "payment_methods");
    }
    return data ?? [];
  },

  async createPaymentMethod(userId: string, data: Record<string, unknown>) {
    const client = getDbClient();
    const payload = normalizePaymentMethodPayload(data, false);
    const existing = await this.getMyPaymentMethods(userId);
    const shouldBeDefault = Boolean(payload.is_default) || existing.length === 0;
    payload.is_default = shouldBeDefault;

    if (shouldBeDefault && existing.length > 0) {
      await client.from("payment_methods").update({ is_default: false }).eq("user_id", userId);
    }

    const { data: created, error } = await client
      .from("payment_methods")
      .insert({ ...payload, user_id: userId })
      .select("id, user_id, type, provider, label, brand, last4, expiry_month, expiry_year, phone, holder_name, is_default, created_at, updated_at")
      .single();

    if (error) throwDbError(error, "payment_methods");
    return created;
  },

  async updatePaymentMethod(methodId: string, userId: string, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const { data: existing, error: fetchError } = await client
      .from("payment_methods")
      .select("id, user_id, is_default")
      .eq("id", methodId)
      .maybeSingle();

    if (fetchError) throwDbError(fetchError, "payment_methods");
    if (!existing) throw new AppError("Payment method not found", 404);
    if (userRole !== "admin" && existing.user_id !== userId) {
      throw new AppError("Access denied to this payment method", 403);
    }

    const payload = normalizePaymentMethodPayload(data, true);
    if (payload.is_default === true) {
      await client
        .from("payment_methods")
        .update({ is_default: false })
        .eq("user_id", existing.user_id);
    }

    const { data: updated, error } = await client
      .from("payment_methods")
      .update(payload)
      .eq("id", methodId)
      .select("id, user_id, type, provider, label, brand, last4, expiry_month, expiry_year, phone, holder_name, is_default, created_at, updated_at")
      .single();

    if (error) throwDbError(error, "payment_methods");
    return updated;
  },

  async deletePaymentMethod(methodId: string, userId: string, userRole?: string) {
    const client = getDbClient();
    const { data: existing, error: fetchError } = await client
      .from("payment_methods")
      .select("id, user_id, is_default")
      .eq("id", methodId)
      .maybeSingle();

    if (fetchError) throwDbError(fetchError, "payment_methods");
    if (!existing) throw new AppError("Payment method not found", 404);
    if (userRole !== "admin" && existing.user_id !== userId) {
      throw new AppError("Access denied to this payment method", 403);
    }

    const { error } = await client.from("payment_methods").delete().eq("id", methodId);
    if (error) throwDbError(error, "payment_methods");

    if (existing.is_default) {
      const { data: remaining } = await client
        .from("payment_methods")
        .select("id")
        .eq("user_id", existing.user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await client.from("payment_methods").update({ is_default: true }).eq("id", remaining[0].id);
      }
    }

    return true;
  },
};
