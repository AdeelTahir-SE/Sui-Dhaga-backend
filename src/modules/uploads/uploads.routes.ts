import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { uploadSingleImage } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as uploadsController from "./uploads.controller.js";

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, WebP, GIF, SVG)
 *               folder:
 *                 type: string
 *                 description: Optional storage subfolder (default 'general')
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 description: Fallback image URL or data URI
 *               folder:
 *                 type: string
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 */
uploadsRoutes.post("/uploads/image", requireAuth, uploadSingleImage("image"), asyncHandler(uploadsController.uploadImage));



/**
 * @openapi
 * /media/{bucket}/{filePath}:
 *   get:
 *     summary: Stream or download media asset from storage
 *     tags: [Uploads]
 *     parameters:
 *       - in: path
 *         name: bucket
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media streamed successfully
 *       206:
 *         description: Partial content streamed successfully
 */
uploadsRoutes.get("/media/:bucket/*", asyncHandler(uploadsController.streamMedia));
