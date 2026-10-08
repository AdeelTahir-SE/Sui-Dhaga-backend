import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { cacheService } from "../../services/cache.service.js";
import { AppError } from "../../utils/app-error.js";

export const reviewsService = {
  async getTailorReviews(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("reviews")
      .select("id, order_id, tailor_id, customer_id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url)")
      .eq("tailor_id", tailorId)
      .order("created_at", { ascending: false });

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async getOrderReview(orderId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("reviews")
      .select("id, order_id, tailor_id, customer_id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url)")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) throw new AppError(error.message, 400);
    return data ?? null;
  },

  async createOrderReview(orderId: string, userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);

    let tailorId = mapped.tailor_id as string | undefined;
    if (!tailorId) {
      const { data: order } = await client.from("orders").select("tailor_id").eq("id", orderId).single();
      tailorId = order?.tailor_id;
    }

    if (!tailorId) {
      throw new AppError("Tailor ID is required for review", 400);
    }

    // Check if review already exists for this order by this user
    const { data: existing } = await client
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .maybeSingle();

    let resultReview;
    if (existing?.id) {
      const { data: updated, error: updateError } = await client
        .from("reviews")
        .update({
          ...mapped,
          rating: mapped.rating,
          comment: mapped.comment,
          images: mapped.images,
        })
        .eq("id", existing.id)
        .select("id, order_id, tailor_id, customer_id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url)")
        .single();
      if (updateError) throw new AppError(updateError.message, 400);
      resultReview = updated;
    } else {
      const { data: created, error } = await client
        .from("reviews")
        .insert({
          ...mapped,
          order_id: orderId,
          customer_id: userId,
          tailor_id: tailorId,
        })
        .select("id, order_id, tailor_id, customer_id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url)")
        .single();

      if (error) throw new AppError(error.message, 400);
      resultReview = created;
    }

    const { data: allReviews } = await client.from("reviews").select("rating").eq("tailor_id", tailorId);
    if (allReviews && allReviews.length > 0) {
      const totalRating = allReviews.reduce((acc, curr) => acc + Number(curr.rating), 0);
      const avgRating = Number((totalRating / allReviews.length).toFixed(2));
      await client.from("tailors").update({ rating: avgRating, review_count: allReviews.length }).eq("id", tailorId);
    }

    cacheService.del(`tailor:${tailorId}`);
    cacheService.delByPattern("tailors:*");
    return resultReview;
  },

  async updateReview(reviewId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    let query = client.from("reviews").update(mapped).eq("id", reviewId);

    if (userId && userRole !== "admin") {
      query = query.eq("customer_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);

    if (updated?.tailor_id) {
      cacheService.del(`tailor:${updated.tailor_id}`);
    }
    cacheService.delByPattern("tailors:*");
    return updated;
  },

  async deleteReview(reviewId: string, userId: string | undefined, userRole: string | undefined) {
    const res = await deleteTableData({
      table: "reviews",
      id: reviewId,
      userId,
      userIdColumn: "customer_id",
      userRole,
    });
    cacheService.delByPattern("tailor:*");
    cacheService.delByPattern("tailors:*");
    return res;
  },
};

