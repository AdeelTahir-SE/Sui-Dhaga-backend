import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

function normalizeAddressPayload(data: Record<string, unknown>, isPartial = false) {
  const payload: Record<string, unknown> = {};

  if (data.label !== undefined) payload.label = String(data.label).trim() || "Home";
  else if (!isPartial) payload.label = "Home";

  const recipient = data.recipientName ?? data.recipient_name ?? data.fullName;
  if (recipient !== undefined) payload.recipient_name = String(recipient).trim();

  if (data.phone !== undefined) payload.phone = String(data.phone).trim();

  const street = data.street ?? data.addressLine1 ?? data.address_line_1;
  if (street !== undefined) payload.street = String(street).trim();

  const line2 = data.addressLine2 ?? data.address_line_2;
  if (line2 !== undefined) payload.address_line_2 = String(line2).trim() || null;

  if (data.city !== undefined) payload.city = String(data.city).trim();

  const stateVal = data.state ?? data.province;
  if (stateVal !== undefined) payload.state = String(stateVal).trim() || null;

  const postal = data.postalCode ?? data.postal_code;
  if (postal !== undefined) payload.postal_code = String(postal).trim() || null;

  if (data.country !== undefined) payload.country = String(data.country).trim() || "Pakistan";
  else if (!isPartial) payload.country = "Pakistan";

  if (data.latitude !== undefined) payload.latitude = Number(data.latitude);
  if (data.longitude !== undefined) payload.longitude = Number(data.longitude);

  const isDefault = data.isDefault ?? data.is_default;
  if (typeof isDefault === "boolean") payload.is_default = isDefault;

  return payload;
}

export const addressesService = {
  async getMyAddresses(userId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("addresses")
      .select("*")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throwDbError(error, "addresses");
    }
    return data ?? [];
  },

  async getAddressById(addressId: string, userId: string, userRole?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("addresses")
      .select("*")
      .eq("id", addressId)
      .maybeSingle();

    if (error) throwDbError(error, "addresses");
    if (!data) throw new AppError("Address not found", 404);
    if (userRole !== "admin" && data.user_id !== userId) {
      throw new AppError("You do not have access to this address", 403);
    }
    return data;
  },

  async createAddress(userId: string, data: Record<string, unknown>) {
    const client = getDbClient();
    const payload = normalizeAddressPayload(data, false);

    // Check existing count so first saved address automatically becomes default
    const existing = await this.getMyAddresses(userId);
    const shouldBeDefault = Boolean(payload.is_default) || existing.length === 0;
    payload.is_default = shouldBeDefault;

    if (shouldBeDefault && existing.length > 0) {
      await client.from("addresses").update({ is_default: false }).eq("user_id", userId);
    }

    const { data: created, error } = await client
      .from("addresses")
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) throwDbError(error, "addresses");
    return created;
  },

  async updateAddress(addressId: string, userId: string, userRole: string | undefined, data: Record<string, unknown>) {
    const existing = await this.getAddressById(addressId, userId, userRole);
    const payload = normalizeAddressPayload(data, true);
    const client = getDbClient();

    if (payload.is_default === true) {
      await client
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", existing.user_id);
    }

    const { data: updated, error } = await client
      .from("addresses")
      .update(payload)
      .eq("id", addressId)
      .select()
      .single();

    if (error) throwDbError(error, "addresses");
    return updated;
  },

  async deleteAddress(addressId: string, userId: string, userRole?: string) {
    const existing = await this.getAddressById(addressId, userId, userRole);
    const client = getDbClient();

    const { error } = await client.from("addresses").delete().eq("id", addressId);
    if (error) throwDbError(error, "addresses");

    if (existing.is_default) {
      const { data: remaining } = await client
        .from("addresses")
        .select("id")
        .eq("user_id", existing.user_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (remaining && remaining.length > 0) {
        await client.from("addresses").update({ is_default: true }).eq("id", remaining[0].id);
      }
    }

    return true;
  },
};
