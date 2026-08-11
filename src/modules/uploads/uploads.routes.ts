import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as uploadsController from "./uploads.controller.js";
import { uploadImageSchema, uploadImagesSchema, uploadFileSchema } from "./uploads.validator.js";

export const uploadsRoutes = Router();

uploadsRoutes.post("/uploads/image", requireAuth, validate(uploadImageSchema), asyncHandler(uploadsController.uploadImage));
uploadsRoutes.post("/uploads/images", requireAuth, validate(uploadImagesSchema), asyncHandler(uploadsController.uploadImages));
uploadsRoutes.post("/uploads/file", requireAuth, validate(uploadFileSchema), asyncHandler(uploadsController.uploadFile));
uploadsRoutes.delete("/uploads/:fileId", requireAuth, asyncHandler(uploadsController.deleteFile));
