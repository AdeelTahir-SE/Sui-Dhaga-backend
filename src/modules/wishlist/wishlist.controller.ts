import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { wishlistService } from "./wishlist.service.js";

export const getWishlist: RequestHandler = async (req, res) => {
  const wishlist = await wishlistService.getWishlist(req.user?.id, req.userRole);
  success(res, wishlist, "Wishlist fetched successfully");
};

export const addTailorToWishlist: RequestHandler = async (req, res) => {
  const result = await wishlistService.addTailorToWishlist(asString(req.params.tailorId), req.user?.id, req.userRole);
  success(res, result, "Tailor added to wishlist", 201);
};

export const removeTailorFromWishlist: RequestHandler = async (req, res) => {
  await wishlistService.removeTailorFromWishlist(asString(req.params.tailorId), req.user?.id, req.userRole);
  success(res, null, "Tailor removed from wishlist");
};

export const addDesignToWishlist: RequestHandler = async (req, res) => {
  const result = await wishlistService.addDesignToWishlist(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, result, "Design added to wishlist", 201);
};

export const removeDesignFromWishlist: RequestHandler = async (req, res) => {
  await wishlistService.removeDesignFromWishlist(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, null, "Design removed from wishlist");
};
