import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { wishlistService } from "./wishlist.service.js";

export const wishlistRoutes = Router();

const customerAuth = [requireAuth, requireRole("customer")];

wishlistRoutes.get(
  "/wishlist",
  ...customerAuth,
  asyncHandler(async (req, res) => {
    const items = await wishlistService.getWishlist(req.user?.id, req.userRole);
    success(res, items, "Wishlist fetched successfully");
  }),
);

wishlistRoutes.post(
  "/wishlist/tailors/:tailorId",
  ...customerAuth,
  asyncHandler(async (req, res) => {
    const item = await wishlistService.addTailorToWishlist(asString(req.params.tailorId), req.user?.id, req.userRole);
    success(res, item, "Tailor added to wishlist", 201);
  }),
);

wishlistRoutes.delete(
  "/wishlist/tailors/:tailorId",
  ...customerAuth,
  asyncHandler(async (req, res) => {
    await wishlistService.removeTailorFromWishlist(asString(req.params.tailorId), req.user?.id, req.userRole);
    success(res, null, "Tailor removed from wishlist");
  }),
);

wishlistRoutes.post(
  "/wishlist/designs/:designId",
  ...customerAuth,
  asyncHandler(async (req, res) => {
    const item = await wishlistService.addDesignToWishlist(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, item, "Design added to wishlist", 201);
  }),
);

wishlistRoutes.delete(
  "/wishlist/designs/:designId",
  ...customerAuth,
  asyncHandler(async (req, res) => {
    await wishlistService.removeDesignFromWishlist(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, null, "Design removed from wishlist");
  }),
);
