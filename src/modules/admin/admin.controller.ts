import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { adminService } from "./admin.service.js";

export const getDashboardStats: RequestHandler = async (_req, res) => {
  const stats = await adminService.getDashboardStats();
  success(res, stats, "Admin dashboard stats fetched");
};

export const getUsers: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getUsers(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin users fetched successfully");
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

export const getPayments: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await adminService.getPayments(page, limit);
  paginated(res, result.records, page, limit, result.total, "Admin payments fetched successfully");
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
