import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { uploadsService } from "./uploads.service.js";

export const uploadsRoutes = Router();

uploadsRoutes.post(
  "/uploads/image",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const uploaded = await uploadsService.uploadImage(req.user?.id, req.userRole, req.body);
    success(res, uploaded, "Image uploaded successfully", 201);
  }),
);

uploadsRoutes.post(
  "/uploads/images",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const uploaded = await uploadsService.uploadImages(req.user?.id, req.userRole, req.body);
    success(res, uploaded, "Images uploaded successfully", 201);
  }),
);

uploadsRoutes.post(
  "/uploads/file",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const uploaded = await uploadsService.uploadFile(req.user?.id, req.userRole, req.body);
    success(res, uploaded, "File uploaded successfully", 201);
  }),
);

uploadsRoutes.delete(
  "/uploads/:fileId",
  requireAuth,
  asyncHandler(async (req, res) => {
    await uploadsService.deleteUpload(asString(req.params.fileId), req.user?.id, req.userRole);
    success(res, null, "File deleted successfully");
  }),
);
