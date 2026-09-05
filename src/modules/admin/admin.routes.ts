import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as adminController from "./admin.controller.js";

export const adminRoutes = Router();

const adminAuth = [requireAuth, requireRole("admin")];

/**
 * @openapi
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get overall admin platform statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
adminRoutes.get("/admin/dashboard/stats", ...adminAuth, asyncHandler(adminController.getDashboardStats));

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 */
adminRoutes.get("/admin/users", ...adminAuth, asyncHandler(adminController.getUsers));

/**
 * @openapi
 * /admin/users/{userId}/block:
 *   patch:
 *     summary: Block a user account
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User blocked successfully
 */
adminRoutes.patch("/admin/users/:userId/block", ...adminAuth, asyncHandler(adminController.blockUser));

/**
 * @openapi
 * /admin/users/{userId}/unblock:
 *   patch:
 *     summary: Unblock a user account
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User unblocked successfully
 */
adminRoutes.patch("/admin/users/:userId/unblock", ...adminAuth, asyncHandler(adminController.unblockUser));

/**
 * @openapi
 * /admin/tailors:
 *   get:
 *     summary: List all tailors for verification and moderation
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tailors list retrieved successfully
 */
adminRoutes.get("/admin/tailors", ...adminAuth, asyncHandler(adminController.getTailors));

/**
 * @openapi
 * /admin/tailors/{tailorId}/verify:
 *   patch:
 *     summary: Verify a tailor application
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tailor verified successfully
 */
adminRoutes.patch("/admin/tailors/:tailorId/verify", ...adminAuth, asyncHandler(adminController.verifyTailor));

/**
 * @openapi
 * /admin/tailors/{tailorId}/reject:
 *   patch:
 *     summary: Reject a tailor application
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tailor rejected
 */
adminRoutes.patch("/admin/tailors/:tailorId/reject", ...adminAuth, asyncHandler(adminController.rejectTailor));

/**
 * @openapi
 * /admin/orders:
 *   get:
 *     summary: List all platform orders (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Platform orders list retrieved successfully
 */
adminRoutes.get("/admin/orders", ...adminAuth, asyncHandler(adminController.getOrders));

/**
 * @openapi
 * /admin/payments:
 *   get:
 *     summary: List all platform payments (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Platform payments retrieved successfully
 */
adminRoutes.get("/admin/payments", ...adminAuth, asyncHandler(adminController.getPayments));

/**
 * @openapi
 * /admin/reports:
 *   get:
 *     summary: List platform reports and issues
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Reports retrieved successfully
 */
adminRoutes.get("/admin/reports", ...adminAuth, asyncHandler(adminController.getReports));

/**
 * @openapi
 * /admin/community/posts/{postId}:
 *   delete:
 *     summary: Moderate and delete a community post (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Community post removed by admin
 */
adminRoutes.delete("/admin/community/posts/:postId", ...adminAuth, asyncHandler(adminController.deleteCommunityPost));
