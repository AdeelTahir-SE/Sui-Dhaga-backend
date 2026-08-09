import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const adminService = {
  async getDashboardStats() {
    return {
      totalUsers: 120,
      totalTailors: 45,
      totalOrders: 350,
      revenue: 15400,
    };
  },

  async getUsers(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "profiles",
      userRole: "admin",
      page,
      limit,
    });
  },

  async setBlockStatus(userId: string, blocked: boolean) {
    return saveResource({
      resourceType: "profiles",
      id: userId,
      userRole: "admin",
      data: { is_blocked: blocked },
    });
  },

  async getTailors(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "tailors",
      userRole: "admin",
      page,
      limit,
    });
  },

  async setTailorVerification(tailorId: string, status: "verified" | "rejected") {
    return saveResource({
      resourceType: "tailors",
      id: tailorId,
      userRole: "admin",
      data: { verification_status: status, verified: status === "verified" },
    });
  },

  async getOrders(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "orders",
      userRole: "admin",
      page,
      limit,
    });
  },

  async getPayments(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "payments",
      userRole: "admin",
      page,
      limit,
    });
  },

  async getReports(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "reports",
      userRole: "admin",
      page,
      limit,
    });
  },

  async deleteCommunityPost(postId: string) {
    return deleteResource({
      resourceType: "community_posts",
      id: postId,
      userRole: "admin",
    });
  },
};
