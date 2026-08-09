import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { adminService } from "./admin.service.js";

export const adminRoutes = Router();

const adminAuth = [requireAuth, requireRole("admin")];

adminRoutes.get(
  "/admin/dashboard/stats",
  ...adminAuth,
  asyncHandler(async (_req, res) => {
    const stats = await adminService.getDashboardStats();
    success(res, stats, "Admin dashboard stats fetched");
  }),
);

adminRoutes.get(
  "/admin/users",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await adminService.getUsers(page, limit);
    paginated(res, result.records, page, limit, result.total, "Admin users fetched successfully");
  }),
);

adminRoutes.patch(
  "/admin/users/:userId/block",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const result = await adminService.setBlockStatus(asString(req.params.userId), true);
    success(res, result, "User blocked successfully");
  }),
);

adminRoutes.patch(
  "/admin/users/:userId/unblock",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const result = await adminService.setBlockStatus(asString(req.params.userId), false);
    success(res, result, "User unblocked successfully");
  }),
);

adminRoutes.get(
  "/admin/tailors",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await adminService.getTailors(page, limit);
    paginated(res, result.records, page, limit, result.total, "Admin tailors fetched successfully");
  }),
);

adminRoutes.patch(
  "/admin/tailors/:tailorId/verify",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const result = await adminService.setTailorVerification(asString(req.params.tailorId), "verified");
    success(res, result, "Tailor verified successfully");
  }),
);

adminRoutes.patch(
  "/admin/tailors/:tailorId/reject",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const result = await adminService.setTailorVerification(asString(req.params.tailorId), "rejected");
    success(res, result, "Tailor application rejected");
  }),
);

adminRoutes.get(
  "/admin/orders",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await adminService.getOrders(page, limit);
    paginated(res, result.records, page, limit, result.total, "Admin orders fetched successfully");
  }),
);

adminRoutes.get(
  "/admin/payments",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await adminService.getPayments(page, limit);
    paginated(res, result.records, page, limit, result.total, "Admin payments fetched successfully");
  }),
);

adminRoutes.get(
  "/admin/reports",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await adminService.getReports(page, limit);
    paginated(res, result.records, page, limit, result.total, "Admin reports fetched successfully");
  }),
);

adminRoutes.delete(
  "/admin/community/posts/:postId",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    await adminService.deleteCommunityPost(asString(req.params.postId));
    success(res, null, "Community post deleted by admin");
  }),
);
