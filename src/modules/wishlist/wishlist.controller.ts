import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { wishlistService } from "./wishlist.service.js";

export const getWishlist: RequestHandler = async (req, res) => {
  const items = await wishlistService.getWishlist(req.user!.id);
  success(res, items, "Wishlist fetched successfully");
};

export const checkWishlistItem: RequestHandler = async (req, res) => {
  const result = await wishlistService.checkWishlistItem(req.user!.id, asString(req.params.tailorId));
  success(res, result, "Wishlist item status fetched successfully");
};

export const addTailorToWishlist: RequestHandler = async (req, res) => {
  const itemType =
    (typeof req.query.type === "string" ? req.query.type : undefined) ||
    (typeof req.body?.itemType === "string" ? req.body.itemType : undefined) ||
    "tailor";
  const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
  const created = await wishlistService.addToWishlist(
    req.user!.id,
    asString(req.params.tailorId),
    itemType,
    notes
  );
  success(res, created, "Added to wishlist successfully", 201);
};

export const addDesignToWishlist: RequestHandler = async (req, res) => {
  const notes = typeof req.body?.notes === "string" ? req.body.notes : undefined;
  const created = await wishlistService.addToWishlist(
    req.user!.id,
    asString(req.params.designId),
    "design",
    notes
  );
  success(res, created, "Design added to wishlist successfully", 201);
};

export const removeFromWishlist: RequestHandler = async (req, res) => {
  const targetId = asString(req.params.tailorId || req.params.designId);
  await wishlistService.removeFromWishlist(req.user!.id, targetId);
  success(res, null, "Removed from wishlist successfully");
};
