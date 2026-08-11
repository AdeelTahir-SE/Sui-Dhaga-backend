import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as wishlistController from "./wishlist.controller.js";

export const wishlistRoutes = Router();

const customerAuth = [requireAuth, requireRole("customer", "admin")];

wishlistRoutes.get("/wishlist", ...customerAuth, asyncHandler(wishlistController.getWishlist));
wishlistRoutes.post("/wishlist/tailors/:tailorId", ...customerAuth, asyncHandler(wishlistController.addTailorToWishlist));
wishlistRoutes.delete("/wishlist/tailors/:tailorId", ...customerAuth, asyncHandler(wishlistController.removeTailorFromWishlist));
wishlistRoutes.post("/wishlist/designs/:designId", ...customerAuth, asyncHandler(wishlistController.addDesignToWishlist));
wishlistRoutes.delete("/wishlist/designs/:designId", ...customerAuth, asyncHandler(wishlistController.removeDesignFromWishlist));
