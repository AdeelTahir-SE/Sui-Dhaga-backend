import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as wishlistController from "./wishlist.controller.js";

export const wishlistRoutes = Router();

/**
 * @openapi
 * /wishlist:
 *   get:
 *     summary: Get all saved tailors and designs in authenticated user's wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Wishlist items retrieved successfully
 * /wishlist/{tailorId}:
 *   get:
 *     summary: Check whether a tailor or design is in user's wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Wishlist status returned
 *   post:
 *     summary: Add a tailor (or design via ?type=design) to wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Added to wishlist
 *   delete:
 *     summary: Remove a tailor or design from wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Removed from wishlist
 * /wishlist/tailors/{tailorId}:
 *   post:
 *     summary: Add a tailor to user's wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Tailor added to wishlist
 *   delete:
 *     summary: Remove a tailor from user's wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tailor removed from wishlist
 * /wishlist/designs/{designId}:
 *   post:
 *     summary: Add a design to user's wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Design added to wishlist
 *   delete:
 *     summary: Remove a design from user's wishlist
 *     tags: [Wishlist]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Design removed from wishlist
 */
wishlistRoutes.get("/wishlist", requireAuth, asyncHandler(wishlistController.getWishlist));
wishlistRoutes.post(
  "/wishlist/tailors/:tailorId",
  requireAuth,
  asyncHandler(wishlistController.addTailorToWishlist)
);
wishlistRoutes.delete(
  "/wishlist/tailors/:tailorId",
  requireAuth,
  asyncHandler(wishlistController.removeFromWishlist)
);
wishlistRoutes.post(
  "/wishlist/designs/:designId",
  requireAuth,
  asyncHandler(wishlistController.addDesignToWishlist)
);
wishlistRoutes.delete(
  "/wishlist/designs/:designId",
  requireAuth,
  asyncHandler(wishlistController.removeFromWishlist)
);
wishlistRoutes.get("/wishlist/:tailorId", requireAuth, asyncHandler(wishlistController.checkWishlistItem));
wishlistRoutes.post("/wishlist/:tailorId", requireAuth, asyncHandler(wishlistController.addTailorToWishlist));
wishlistRoutes.delete("/wishlist/:tailorId", requireAuth, asyncHandler(wishlistController.removeFromWishlist));
