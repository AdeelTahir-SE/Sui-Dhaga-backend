import {
  getDbClient,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const adminService = {
  async getDashboardStats() {
    const client = getDbClient();

    const [
      { count: totalUsers },
      { count: totalTailors },
      { count: totalOrders },
      { data: paymentsData },
    ] = await Promise.all([
      client.from("profiles").select("*", { count: "exact", head: true }),
      client.from("tailors").select("*", { count: "exact", head: true }),
      client.from("orders").select("*", { count: "exact", head: true }),
      client.from("payments").select("amount").eq("status", "completed"),
    ]);

    const revenue = (paymentsData ?? []).reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0,
    );

    return {
      totalUsers: totalUsers ?? 0,
      totalTailors: totalTailors ?? 0,
      totalOrders: totalOrders ?? 0,
      revenue,
    };
  },

  async getUsers(page = 1, limit = 20) {
    return fetchTableData({
      table: "profiles",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async setBlockStatus(userId: string, blocked: boolean) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .update({
        is_blocked: blocked,
        status: blocked ? "blocked" : "active",
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  },

  async getTailors(page = 1, limit = 20) {
    return fetchTableData({
      table: "tailors",
      select: "*, profile:profiles(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async setTailorVerification(tailorId: string, status: "verified" | "rejected") {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .update({
        verification_status: status,
        verified: status === "verified",
      })
      .eq("id", tailorId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  },

  async getOrders(page = 1, limit = 20) {
    return fetchTableData({
      table: "orders",
      select: "*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*), service:tailor_services!service_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getPayments(page = 1, limit = 20) {
    return fetchTableData({
      table: "payments",
      select: "*, user:profiles!user_id(*), order:orders!order_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getReports(page = 1, limit = 20) {
    return fetchTableData({
      table: "reports",
      select: "*, reporter:profiles!reporter_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async deleteCommunityPost(postId: string) {
    return deleteTableData({
      table: "community_posts",
      id: postId,
    });
  },
};

