import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as adminController from "./admin.controller.js";

export const adminRoutes = Router();

const adminAuth = [requireAuth, requireRole("admin")];

adminRoutes.get("/admin/dashboard/stats", ...adminAuth, asyncHandler(adminController.getDashboardStats));
adminRoutes.get("/admin/users", ...adminAuth, asyncHandler(adminController.getUsers));
adminRoutes.patch("/admin/users/:userId/block", ...adminAuth, asyncHandler(adminController.blockUser));
adminRoutes.patch("/admin/users/:userId/unblock", ...adminAuth, asyncHandler(adminController.unblockUser));
adminRoutes.get("/admin/tailors", ...adminAuth, asyncHandler(adminController.getTailors));
adminRoutes.patch("/admin/tailors/:tailorId/verify", ...adminAuth, asyncHandler(adminController.verifyTailor));
adminRoutes.patch("/admin/tailors/:tailorId/reject", ...adminAuth, asyncHandler(adminController.rejectTailor));
adminRoutes.get("/admin/orders", ...adminAuth, asyncHandler(adminController.getOrders));
adminRoutes.get("/admin/payments", ...adminAuth, asyncHandler(adminController.getPayments));
adminRoutes.get("/admin/reports", ...adminAuth, asyncHandler(adminController.getReports));
adminRoutes.delete("/admin/community/posts/:postId", ...adminAuth, asyncHandler(adminController.deleteCommunityPost));
