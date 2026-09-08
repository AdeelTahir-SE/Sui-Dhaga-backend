import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { uploadSingleImage, uploadMultipleImages, uploadDocument } from "../../middlewares/upload.middleware.js";
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
 * /uploads/images:
 *   post:
 *     summary: Upload multiple images
 *     tags: [Uploads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [images]
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Image files to upload (max 10)
 *               folder:
 *                 type: string
 *         application/json:
 *           schema:
 *             type: object
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
uploadsRoutes.post("/uploads/images", requireAuth, uploadMultipleImages("images", 10), asyncHandler(uploadsController.uploadImages));

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file to upload (PDF, DOCX, TXT, images)
 *               folder:
 *                 type: string
 *         application/json:
 *           schema:
 *             type: object
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
uploadsRoutes.post("/uploads/file", requireAuth, uploadDocument("file"), asyncHandler(uploadsController.uploadFile));

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
