import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as uploadsController from "./uploads.controller.js";
import { uploadImageSchema, uploadImagesSchema, uploadFileSchema } from "./uploads.validator.js";

export const uploadsRoutes = Router();

/**
 * @openapi
 * /uploads/image:
 *   post:
 *     summary: Upload a single image
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 description: Base64 data URL or image path
 *               folder:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 */
uploadsRoutes.post("/uploads/image", requireAuth, validate(uploadImageSchema), asyncHandler(uploadsController.uploadImage));

/**
 * @openapi
 * /uploads/images:
 *   post:
 *     summary: Upload multiple images
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               folder:
 *                 type: string
 *     responses:
 *       201:
 *         description: Images uploaded successfully
 */
uploadsRoutes.post("/uploads/images", requireAuth, validate(uploadImagesSchema), asyncHandler(uploadsController.uploadImages));

/**
 * @openapi
 * /uploads/file:
 *   post:
 *     summary: Upload a document/file
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *               fileName:
 *                 type: string
 *               folder:
 *                 type: string
 *     responses:
 *       201:
 *         description: File uploaded successfully
 */
uploadsRoutes.post("/uploads/file", requireAuth, validate(uploadFileSchema), asyncHandler(uploadsController.uploadFile));

/**
 * @openapi
 * /uploads/{fileId}:
 *   delete:
 *     summary: Delete an uploaded file
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
uploadsRoutes.delete("/uploads/:fileId", requireAuth, asyncHandler(uploadsController.deleteFile));
