import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const wishlistService = {
  async getWishlist(userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data, error } = await client
      .from("wishlist_items")
      .select("*, tailor:tailors(*), design:designs(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addTailorToWishlist(tailorId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data, error } = await client
      .from("wishlist_items")
      .insert({
        user_id: userId,
        item_type: "tailor",
        tailor_id: tailorId,
      })
      .select("*, tailor:tailors(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  },

  async removeTailorFromWishlist(tailorId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { error } = await client
      .from("wishlist_items")
      .delete()
      .eq("user_id", userId)
      .eq("tailor_id", tailorId);

    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async addDesignToWishlist(designId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data, error } = await client
      .from("wishlist_items")
      .insert({
        user_id: userId,
        item_type: "design",
        design_id: designId,
      })
      .select("*, design:designs(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  },

  async removeDesignFromWishlist(designId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { error } = await client
      .from("wishlist_items")
      .delete()
      .eq("user_id", userId)
      .eq("design_id", designId);

    if (error) throw new AppError(error.message, 400);
    return true;
  },
};

