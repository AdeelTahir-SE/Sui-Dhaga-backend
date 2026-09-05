import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as wishlistController from "./wishlist.controller.js";

export const wishlistRoutes = Router();

const customerAuth = [requireAuth, requireRole("customer", "admin")];

/**
 * @openapi
 * /wishlist:
 *   get:
 *     summary: Get user wishlist (saved tailors and designs)
 *     tags: [Wishlist]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User wishlist retrieved successfully
 */
wishlistRoutes.get("/wishlist", ...customerAuth, asyncHandler(wishlistController.getWishlist));

/**
 * @openapi
 * /wishlist/tailors/{tailorId}:
 *   post:
 *     summary: Save tailor to wishlist
 *     tags: [Wishlist]
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
 *         description: Tailor saved to wishlist
 *   delete:
 *     summary: Remove tailor from wishlist
 *     tags: [Wishlist]
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
 *         description: Tailor removed from wishlist
 */
wishlistRoutes.post("/wishlist/tailors/:tailorId", ...customerAuth, asyncHandler(wishlistController.addTailorToWishlist));
wishlistRoutes.delete("/wishlist/tailors/:tailorId", ...customerAuth, asyncHandler(wishlistController.removeTailorFromWishlist));

/**
 * @openapi
 * /wishlist/designs/{designId}:
 *   post:
 *     summary: Save design to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Design saved to wishlist
 *   delete:
 *     summary: Remove design from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Design removed from wishlist
 */
wishlistRoutes.post("/wishlist/designs/:designId", ...customerAuth, asyncHandler(wishlistController.addDesignToWishlist));
wishlistRoutes.delete("/wishlist/designs/:designId", ...customerAuth, asyncHandler(wishlistController.removeDesignFromWishlist));
