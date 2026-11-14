import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { cacheService } from "../../services/cache.service.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingColumnError, throwDbError } from "../../utils/supabase-error.js";

const REVIEW_SELECT_WITH_EXTRAS =
  "id, order_id, tailor_id, customer_id, rating, comment, images, tailor_reply, replied_at, moderation_status, created_at, customer:profiles!customer_id(id, full_name, avatar_url)";
const REVIEW_SELECT_BASE =
  "id, order_id, tailor_id, customer_id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url)";

export const reviewsService = {
  async getTailorReviews(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("reviews")
      .select(REVIEW_SELECT_WITH_EXTRAS)
      .eq("tailor_id", tailorId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingColumnError(error)) {
        const fallback = await client
          .from("reviews")
          .select(REVIEW_SELECT_BASE)
          .eq("tailor_id", tailorId)
          .order("created_at", { ascending: false });
        if (fallback.error) throw new AppError(fallback.error.message, 400);
        return fallback.data ?? [];
      }
      throw new AppError(error.message, 400);
    }

    return (data ?? []).filter((r: any) => r.moderation_status !== "hidden");
  },

  async getOrderReview(orderId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("reviews")
      .select(REVIEW_SELECT_WITH_EXTRAS)
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error)) {
        const fallback = await client
          .from("reviews")
          .select(REVIEW_SELECT_BASE)
          .eq("order_id", orderId)
          .maybeSingle();
        if (fallback.error) throw new AppError(fallback.error.message, 400);
        return fallback.data ?? null;
      }
      throw new AppError(error.message, 400);
    }
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
        .select(REVIEW_SELECT_BASE)
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
        .select(REVIEW_SELECT_BASE)
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

  async createTailorReview(
    tailorId: string,
    userId: string | undefined,
    _userRole: string | undefined,
    data: Record<string, unknown>
  ) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);

    let resolvedTailorId = tailorId;
    const { data: tailorRec } = await client
      .from("tailors")
      .select("id, user_id")
      .or(`id.eq.${tailorId},user_id.eq.${tailorId}`)
      .maybeSingle();

    if (tailorRec?.id) {
      resolvedTailorId = tailorRec.id;
    }

    const rating = Number(mapped.rating);
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError("Rating must be between 1 and 5", 400);
    }

    const { data: existingList } = await client
      .from("reviews")
      .select("id, order_id")
      .eq("tailor_id", resolvedTailorId)
      .eq("customer_id", userId);

    const existing = (existingList || []).find((r: any) => !r.order_id);

    let resultReview;
    if (existing?.id) {
      const { data: updated, error: updateError } = await client
        .from("reviews")
        .update({
          rating,
          comment: mapped.comment || null,
          images: Array.isArray(mapped.images) ? mapped.images : [],
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select(REVIEW_SELECT_BASE)
        .single();
      if (updateError) throw new AppError(updateError.message, 400);
      resultReview = updated;
    } else {
      const { data: created, error } = await client
        .from("reviews")
        .insert({
          tailor_id: resolvedTailorId,
          customer_id: userId,
          rating,
          comment: mapped.comment || null,
          images: Array.isArray(mapped.images) ? mapped.images : [],
        })
        .select(REVIEW_SELECT_BASE)
        .single();
      if (error) throw new AppError(error.message, 400);
      resultReview = created;
    }

    const { data: allReviews } = await client.from("reviews").select("rating").eq("tailor_id", resolvedTailorId);
    if (allReviews && allReviews.length > 0) {
      const totalRating = allReviews.reduce((acc, curr) => acc + Number(curr.rating), 0);
      const avgRating = Number((totalRating / allReviews.length).toFixed(2));
      await client.from("tailors").update({ rating: avgRating, review_count: allReviews.length }).eq("id", resolvedTailorId);
    }

    cacheService.del(`tailor:${resolvedTailorId}`);
    cacheService.delByPattern("tailors:*");
    return resultReview;
  },

  async replyToReview(
    reviewId: string,
    userId: string | undefined,
    userRole: string | undefined,
    data: Record<string, unknown>,
    tailorIdParam?: string
  ) {
    if (!userId) throw new AppError("Authentication required", 401);
    const replyText = String(data.reply || data.tailorReply || data.comment || "").trim();
    if (!replyText) {
      throw new AppError("Reply text is required", 400);
    }

    const client = getDbClient();
    const { data: review, error: findError } = await client
      .from("reviews")
      .select("id, tailor_id, customer_id, order_id")
      .eq("id", reviewId)
      .maybeSingle();

    if (findError) throw new AppError(findError.message, 400);
    if (!review) throw new AppError("Review not found", 404);

    const { data: tailor, error: tailorError } = await client
      .from("tailors")
      .select("id, user_id, shop_name")
      .eq("id", review.tailor_id)
      .maybeSingle();

    if (tailorError) throw new AppError(tailorError.message, 400);
    if (!tailor) throw new AppError("Tailor for this review not found", 404);

    if (tailorIdParam && tailorIdParam !== tailor.id && tailorIdParam !== tailor.user_id && userRole !== "admin") {
      throw new AppError("Review does not belong to this tailor", 403);
    }

    if (userRole !== "admin" && tailor.user_id !== userId) {
      throw new AppError("Only the reviewed tailor can reply to this review", 403);
    }

    const { data: updated, error: updateError } = await client
      .from("reviews")
      .update({
        tailor_reply: replyText,
        replied_at: new Date().toISOString(),
      })
      .eq("id", reviewId)
      .select(REVIEW_SELECT_WITH_EXTRAS)
      .single();

    if (updateError) {
      throwDbError(updateError, "reviews");
    }

    if (review.customer_id) {
      await notificationsService
        .createNotification({
          userId: review.customer_id,
          title: "Tailor replied to your review",
          message: `${tailor.shop_name || "A tailor"} replied to your review`,
          type: "review_reply",
          data: {
            reviewId: review.id,
            tailorId: tailor.id,
            orderId: review.order_id,
          },
        })
        .catch(() => {});
    }

    cacheService.del(`tailor:${tailor.id}`);
    cacheService.delByPattern("tailors:*");
    return updated;
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
