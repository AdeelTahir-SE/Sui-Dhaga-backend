import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { adminService } from "./admin.service.js";

export const getDashboardStats: RequestHandler = async (_req, res) => {
  const stats = await adminService.getDashboardStats();
  success(res, stats, "Admin dashboard stats fetched");
};

export const getRevenueAnalytics: RequestHandler = async (req, res) => {
  const period = typeof req.query.period === "string" ? req.query.period : "30d";
  const analytics = await adminService.getRevenueAnalytics(period);
  success(res, analytics, "Admin revenue analytics fetched successfully");
};

export const getRecentActivities: RequestHandler = async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const activities = await adminService.getRecentActivities(limit);
  success(res, activities, "Recent platform activities fetched successfully");
};

export const getUsers: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getUsers(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin users fetched successfully");
};

export const createUser: RequestHandler = async (req, res) => {
  const created = await adminService.createUser(req.body);
  success(res, created, "User created successfully", 201);
};

export const getUserById: RequestHandler = async (req, res) => {
  const user = await adminService.getUserById(asString(req.params.userId));
  success(res, user, "Admin user fetched successfully");
};

export const updateUser: RequestHandler = async (req, res) => {
  const updated = await adminService.updateUser(asString(req.params.userId), req.body);
  success(res, updated, "User updated successfully");
};

export const deleteUser: RequestHandler = async (req, res) => {
  await adminService.deleteUser(asString(req.params.userId), req.user?.id);
  success(res, null, "User deleted successfully");
};

export const blockUser: RequestHandler = async (req, res) => {
  const result = await adminService.setBlockStatus(asString(req.params.userId), true);
  success(res, result, "User blocked successfully");
};

export const unblockUser: RequestHandler = async (req, res) => {
  const result = await adminService.setBlockStatus(asString(req.params.userId), false);
  success(res, result, "User unblocked successfully");
};

export const getTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getTailors(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin tailors fetched successfully");
};

export const getTailorById: RequestHandler = async (req, res) => {
  const tailor = await adminService.getTailorById(asString(req.params.tailorId));
  success(res, tailor, "Admin tailor fetched successfully");
};

export const updateTailor: RequestHandler = async (req, res) => {
  const updated = await adminService.updateTailor(asString(req.params.tailorId), req.body);
  success(res, updated, "Tailor updated successfully");
};

export const verifyTailor: RequestHandler = async (req, res) => {
  const result = await adminService.setTailorVerification(asString(req.params.tailorId), "verified");
  success(res, result, "Tailor verified successfully");
};

export const rejectTailor: RequestHandler = async (req, res) => {
  const result = await adminService.setTailorVerification(asString(req.params.tailorId), "rejected");
  success(res, result, "Tailor application rejected");
};

export const getOrders: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getOrders(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin orders fetched successfully");
};

export const getOrderById: RequestHandler = async (req, res) => {
  const order = await adminService.getOrderById(asString(req.params.orderId));
  success(res, order, "Admin order fetched successfully");
};

export const updateOrderStatus: RequestHandler = async (req, res) => {
  const updated = await adminService.updateOrderStatus(
    asString(req.params.orderId),
    String(req.body.status),
    typeof req.body.notes === "string" ? req.body.notes : undefined
  );
  success(res, updated, "Order status updated successfully");
};

export const getPayments: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getPayments(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin payments fetched successfully");
};

export const getPayouts: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await adminService.getPayouts(status, page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin payouts fetched successfully");
};

export const processPayout: RequestHandler = async (req, res) => {
  const updated = await adminService.processPayout(
    asString(req.params.id),
    req.user?.id,
    req.body
  );
  success(res, updated, "Payout processed successfully");
};

export const refundPayment: RequestHandler = async (req, res) => {
  const refunded = await adminService.refundPayment(req.body);
  success(res, refunded, "Payment refunded successfully");
};

export const createDispute: RequestHandler = async (req, res) => {
  const created = await adminService.createDispute(
    asString(req.params.orderId),
    req.user!.id,
    req.body
  );
  success(res, created, "Order dispute submitted successfully", 201);
};

export const getDisputes: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await adminService.getDisputes(status, page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin disputes fetched successfully");
};

export const resolveDispute: RequestHandler = async (req, res) => {
  const resolved = await adminService.resolveDispute(
    asString(req.params.id),
    req.user?.id,
    req.body
  );
  success(res, resolved, "Dispute resolved successfully");
};

export const getReviews: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const result = await adminService.getReviews(status, page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin reviews fetched successfully");
};

export const moderateReview: RequestHandler = async (req, res) => {
  const updated = await adminService.moderateReview(asString(req.params.id), req.body);
  success(res, updated, "Review moderated successfully");
};

export const getCmsContent: RequestHandler = async (req, res) => {
  const sectionKey =
    typeof req.query.section === "string"
      ? req.query.section
      : typeof req.query.sectionKey === "string"
        ? req.query.sectionKey
        : undefined;
  const content = await adminService.getCmsContent(sectionKey);
  success(res, content, "CMS content fetched successfully");
};

export const updateCmsContent: RequestHandler = async (req, res) => {
  const updated = await adminService.updateCmsContent(req.user?.id, req.body);
  success(res, updated, "CMS content saved successfully");
};

export const getPlatformSettings: RequestHandler = async (_req, res) => {
  const settings = await adminService.getPlatformSettings();
  success(res, settings, "Platform settings fetched successfully");
};

export const updatePlatformSettings: RequestHandler = async (req, res) => {
  const settings = await adminService.updatePlatformSettings(req.user?.id, req.body);
  success(res, settings, "Platform settings updated successfully");
};

export const getReports: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getReports(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin reports fetched successfully");
};

export const deleteCommunityPost: RequestHandler = async (req, res) => {
  await adminService.deleteCommunityPost(asString(req.params.postId));
  success(res, null, "Community post deleted by admin");
};
