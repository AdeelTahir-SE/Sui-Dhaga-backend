import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

async function resolveTailorRecordId(candidateId: string): Promise<string | null> {
  const cleanId = candidateId.replace(/^tailor_/, "").trim();
  const client = getDbClient();

  const { data: byId } = await client
    .from("tailors")
    .select("id")
    .eq("id", cleanId)
    .maybeSingle();
  if (byId?.id) return byId.id;

  const { data: byUser } = await client
    .from("tailors")
    .select("id")
    .eq("user_id", cleanId)
    .maybeSingle();
  return byUser?.id ?? null;
}

export const wishlistService = {
  async getWishlist(userId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("wishlist_items")
      .select(
        "id, user_id, item_type, tailor_id, design_id, notes, created_at, tailor:tailors(id, shop_name, city, rating, review_count, banner_url, specialties, verified, profile:profiles(id, full_name, avatar_url)), design:designs(id, title, outfit_type, fabric_type, image_url, estimated_price, status)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingTableError(error)) return [];
      throwDbError(error, "wishlist_items");
    }

    return data ?? [];
  },

  async checkWishlistItem(userId: string, targetId: string) {
    const resolvedTailorId = await resolveTailorRecordId(targetId);
    const effectiveId = resolvedTailorId || targetId;
    const client = getDbClient();

    const { data, error } = await client
      .from("wishlist_items")
      .select("id, item_type, tailor_id, design_id")
      .eq("user_id", userId)
      .or(`tailor_id.eq.${effectiveId},design_id.eq.${targetId},id.eq.${targetId}`)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) return { inWishlist: false, item: null };
      throwDbError(error, "wishlist_items");
    }

    return {
      inWishlist: Boolean(data),
      item: data ?? null,
    };
  },

  async addToWishlist(
    userId: string,
    targetId: string,
    itemTypeHint?: string,
    notes?: string
  ) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    let itemType: "tailor" | "design" =
      itemTypeHint === "design" ? "design" : "tailor";
    let tailorId: string | null = null;
    let designId: string | null = null;

    if (itemType === "design") {
      const { data: design } = await client
        .from("designs")
        .select("id")
        .eq("id", targetId)
        .maybeSingle();
      if (!design) throw new AppError("Design not found", 404);
      designId = design.id;
    } else {
      tailorId = await resolveTailorRecordId(targetId);
      if (!tailorId) {
        // Fallback: allow saving design when caller hits generic /wishlist/:id without type query
        const { data: design } = await client
          .from("designs")
          .select("id")
          .eq("id", targetId)
          .maybeSingle();
        if (design) {
          itemType = "design";
          designId = design.id;
        } else {
          throw new AppError("Tailor or design not found", 404);
        }
      }
    }

    let existingQuery = client
      .from("wishlist_items")
      .select("id")
      .eq("user_id", userId)
      .eq("item_type", itemType);

    existingQuery =
      itemType === "tailor"
        ? existingQuery.eq("tailor_id", tailorId!)
        : existingQuery.eq("design_id", designId!);

    const { data: existing, error: findErr } = await existingQuery.maybeSingle();
    if (findErr) {
      throwDbError(findErr, "wishlist_items");
    }

    if (existing) {
      const items = await this.getWishlist(userId);
      return items.find((i: any) => i.id === existing.id) || existing;
    }

    const { data: created, error } = await client
      .from("wishlist_items")
      .insert({
        user_id: userId,
        item_type: itemType,
        tailor_id: tailorId,
        design_id: designId,
        notes: notes || null,
      })
      .select(
        "id, user_id, item_type, tailor_id, design_id, notes, created_at, tailor:tailors(id, shop_name, city, rating, review_count, banner_url, specialties, verified), design:designs(id, title, outfit_type, fabric_type, image_url, estimated_price)"
      )
      .single();

    if (error) throwDbError(error, "wishlist_items");
    return created;
  },

  async removeFromWishlist(userId: string, targetId: string) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const resolvedTailorId = await resolveTailorRecordId(targetId);
    const effectiveTailorId = resolvedTailorId || targetId;

    const { error } = await client
      .from("wishlist_items")
      .delete()
      .eq("user_id", userId)
      .or(`tailor_id.eq.${effectiveTailorId},design_id.eq.${targetId},id.eq.${targetId}`);

    if (error) throwDbError(error, "wishlist_items");
    return true;
  },
};
