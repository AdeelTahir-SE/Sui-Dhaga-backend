import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const reviewsService = {
  async getTailorReviews(tailorId: string) {
    const { records } = await fetchResources({
      resourceType: "reviews",
      isPublic: true,
    });
    return records.filter((r: Record<string, unknown>) => r.tailor_id === tailorId);
  },

  async createOrderReview(orderId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "reviews",
      userId,
      userRole,
      data: { ...data, order_id: orderId },
    });
  },

  async updateReview(reviewId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "reviews",
      id: reviewId,
      userId,
      userRole,
      data,
    });
  },

  async deleteReview(reviewId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "reviews",
      id: reviewId,
      userId,
      userRole,
    });
  },
};
