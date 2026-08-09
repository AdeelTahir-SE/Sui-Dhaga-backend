import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const wishlistService = {
  async getWishlist(userId: string | undefined, userRole: string | undefined) {
    const { records } = await fetchResources({
      resourceType: "wishlists",
      userId,
      userRole,
    });
    return records;
  },

  async addTailorToWishlist(tailorId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "wishlists",
      userId,
      userRole,
      data: { itemType: "tailor", tailorId },
    });
  },

  async removeTailorFromWishlist(tailorId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "wishlists",
      id: tailorId,
      userId,
      userRole,
    });
  },

  async addDesignToWishlist(designId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "wishlists",
      userId,
      userRole,
      data: { itemType: "design", designId },
    });
  },

  async removeDesignFromWishlist(designId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "wishlists",
      id: designId,
      userId,
      userRole,
    });
  },
};
