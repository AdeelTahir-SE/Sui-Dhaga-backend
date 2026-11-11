import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as adminController from "./admin.controller.js";
import {
  adminCreateUserSchema,
  adminProcessPayoutSchema,
  adminRefundPaymentSchema,
  adminUpdateOrderStatusSchema,
  adminUpdateTailorSchema,
  adminUpdateUserSchema,
  createDisputeSchema,
  moderateReviewSchema,
  resolveDisputeSchema,
} from "./admin.validator.js";

export const adminRoutes = Router();

const adminAuth = [requireAuth, requireRole("admin")];

/**
 * @openapi
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get overall admin platform statistics
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 * /admin/dashboard/revenue:
 *   get:
 *     summary: Get time-series revenue and commission analytics
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [7d, 30d, 90d, 12m], default: 30d }
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 * /admin/dashboard/activities:
 *   get:
 *     summary: Get recent platform audit/activity events
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Recent activities retrieved successfully
 */
adminRoutes.get("/admin/dashboard/stats", ...adminAuth, asyncHandler(adminController.getDashboardStats));
adminRoutes.get("/admin/dashboard/revenue", ...adminAuth, asyncHandler(adminController.getRevenueAnalytics));
adminRoutes.get("/admin/dashboard/activities", ...adminAuth, asyncHandler(adminController.getRecentActivities));

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: List all users (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Users list retrieved successfully
 *   post:
 *     summary: Create a new user account as admin
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       201:
 *         description: User created successfully
 * /admin/users/{userId}:
 *   get:
 *     summary: Get full user profile, stats, and tailor info (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *   patch:
 *     summary: Update user role, status, or profile fields (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User updated successfully
 *   delete:
 *     summary: Delete a user account (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
adminRoutes.get("/admin/users", ...adminAuth, asyncHandler(adminController.getUsers));
adminRoutes.post(
  "/admin/users",
  ...adminAuth,
  validate(adminCreateUserSchema),
  asyncHandler(adminController.createUser)
);
adminRoutes.get("/admin/users/:userId", ...adminAuth, asyncHandler(adminController.getUserById));
adminRoutes.patch(
  "/admin/users/:userId",
  ...adminAuth,
  validate(adminUpdateUserSchema),
  asyncHandler(adminController.updateUser)
);
adminRoutes.delete("/admin/users/:userId", ...adminAuth, asyncHandler(adminController.deleteUser));
/**
 * @openapi
 * /admin/users/{userId}/block:
 *   patch:
 *     summary: Block a user account (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User blocked successfully
 * /admin/users/{userId}/unblock:
 *   patch:
 *     summary: Unblock a user account (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User unblocked successfully
 */
adminRoutes.patch("/admin/users/:userId/block", ...adminAuth, asyncHandler(adminController.blockUser));
adminRoutes.patch("/admin/users/:userId/unblock", ...adminAuth, asyncHandler(adminController.unblockUser));

/**
 * @openapi
 * /admin/tailors:
 *   get:
 *     summary: List all tailors for verification and moderation
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tailors list retrieved successfully
 * /admin/tailors/{tailorId}:
 *   get:
 *     summary: Get full tailor details (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tailor details retrieved
 *   patch:
 *     summary: Update tailor status or featured flag (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tailor updated
 */
adminRoutes.get("/admin/tailors", ...adminAuth, asyncHandler(adminController.getTailors));
adminRoutes.get("/admin/tailors/:tailorId", ...adminAuth, asyncHandler(adminController.getTailorById));
adminRoutes.patch(
  "/admin/tailors/:tailorId",
  ...adminAuth,
  validate(adminUpdateTailorSchema),
  asyncHandler(adminController.updateTailor)
);
/**
 * @openapi
 * /admin/tailors/{tailorId}/verify:
 *   patch:
 *     summary: Verify/approve a tailor application (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tailor verified successfully
 * /admin/tailors/{tailorId}/reject:
 *   patch:
 *     summary: Reject a tailor application (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tailor application rejected
 */
adminRoutes.patch("/admin/tailors/:tailorId/verify", ...adminAuth, asyncHandler(adminController.verifyTailor));
adminRoutes.patch("/admin/tailors/:tailorId/reject", ...adminAuth, asyncHandler(adminController.rejectTailor));

/**
 * @openapi
 * /admin/orders:
 *   get:
 *     summary: List all platform orders (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Platform orders list retrieved successfully
 * /admin/orders/{orderId}:
 *   get:
 *     summary: Get single order details with customer, tailor, design, and payments (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details retrieved
 * /admin/orders/{orderId}/status:
 *   patch:
 *     summary: Force-update order status (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order status updated
 */
adminRoutes.get("/admin/orders", ...adminAuth, asyncHandler(adminController.getOrders));
adminRoutes.get("/admin/orders/:orderId", ...adminAuth, asyncHandler(adminController.getOrderById));
adminRoutes.patch(
  "/admin/orders/:orderId/status",
  ...adminAuth,
  validate(adminUpdateOrderStatusSchema),
  asyncHandler(adminController.updateOrderStatus)
);

/**
 * @openapi
 * /admin/payments:
 *   get:
 *     summary: List all platform payments (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Platform payments retrieved successfully
 * /admin/payments/payouts:
 *   get:
 *     summary: List tailor payout requests (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tailor payouts retrieved
 * /admin/payments/payouts/{id}:
 *   post:
 *     summary: Approve or reject a tailor payout request (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payout processed
 *   patch:
 *     summary: Update tailor payout request status (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Payout processed
 * /admin/payments/refund:
 *   post:
 *     summary: Issue a full or partial refund for a payment or order (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Refund processed
 */
adminRoutes.get("/admin/payments", ...adminAuth, asyncHandler(adminController.getPayments));
adminRoutes.get("/admin/payments/payouts", ...adminAuth, asyncHandler(adminController.getPayouts));
adminRoutes.post(
  "/admin/payments/payouts/:id",
  ...adminAuth,
  validate(adminProcessPayoutSchema),
  asyncHandler(adminController.processPayout)
);
adminRoutes.patch(
  "/admin/payments/payouts/:id",
  ...adminAuth,
  validate(adminProcessPayoutSchema),
  asyncHandler(adminController.processPayout)
);
adminRoutes.post(
  "/admin/payments/refund",
  ...adminAuth,
  validate(adminRefundPaymentSchema),
  asyncHandler(adminController.refundPayment)
);

/**
 * @openapi
 * /admin/disputes:
 *   get:
 *     summary: List all customer-tailor order disputes (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Disputes retrieved
 * /admin/disputes/{id}/resolve:
 *   post:
 *     summary: Resolve or close an order dispute (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dispute resolved
 * /admin/reviews:
 *   get:
 *     summary: List reviews for moderation (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Reviews retrieved
 * /admin/reviews/{id}/moderate:
 *   post:
 *     summary: Approve, flag, hide, or delete a review (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Review moderated
 * /admin/cms:
 *   get:
 *     summary: Get CMS editable sections (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: CMS content retrieved
 *   put:
 *     summary: Update CMS editable sections (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: CMS content updated
 * /cms:
 *   get:
 *     summary: Get published CMS content sections
 *     tags: [CMS]
 *     responses:
 *       200:
 *         description: Public CMS content retrieved
 * /admin/settings:
 *   get:
 *     summary: Get platform configuration settings (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Platform settings retrieved
 *   put:
 *     summary: Update platform configuration settings (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Platform settings updated
 */
adminRoutes.get("/admin/disputes", ...adminAuth, asyncHandler(adminController.getDisputes));
adminRoutes.post(
  "/admin/disputes/:id/resolve",
  ...adminAuth,
  validate(resolveDisputeSchema),
  asyncHandler(adminController.resolveDispute)
);
/**
 * @openapi
 * /orders/{orderId}/dispute:
 *   post:
 *     summary: Raise an order dispute (authenticated customer or tailor)
 *     tags: [Orders]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string }
 *               description: { type: string }
 *               evidenceUrls: { type: array, items: { type: string, format: uri } }
 *     responses:
 *       201:
 *         description: Dispute submitted successfully
 */
adminRoutes.post(
  "/orders/:orderId/dispute",
  requireAuth,
  validate(createDisputeSchema),
  asyncHandler(adminController.createDispute)
);
adminRoutes.get("/admin/reviews", ...adminAuth, asyncHandler(adminController.getReviews));
adminRoutes.post(
  "/admin/reviews/:id/moderate",
  ...adminAuth,
  validate(moderateReviewSchema),
  asyncHandler(adminController.moderateReview)
);
adminRoutes.get("/cms", asyncHandler(adminController.getCmsContent));
adminRoutes.get("/admin/cms", ...adminAuth, asyncHandler(adminController.getCmsContent));
adminRoutes.put("/admin/cms", ...adminAuth, asyncHandler(adminController.updateCmsContent));
adminRoutes.get("/admin/settings", ...adminAuth, asyncHandler(adminController.getPlatformSettings));
adminRoutes.put("/admin/settings", ...adminAuth, asyncHandler(adminController.updatePlatformSettings));
/**
 * @openapi
 * /admin/reports:
 *   get:
 *     summary: List user abuse/content reports for moderation (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Admin reports fetched successfully
 * /admin/community/posts/{postId}:
 *   delete:
 *     summary: Delete a community post as admin (admin only)
 *     tags: [Admin]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Community post deleted by admin
 */
adminRoutes.get("/admin/reports", ...adminAuth, asyncHandler(adminController.getReports));
adminRoutes.delete("/admin/community/posts/:postId", ...adminAuth, asyncHandler(adminController.deleteCommunityPost));
