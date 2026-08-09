import {
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const reviewsService = {
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
