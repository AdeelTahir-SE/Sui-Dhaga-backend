import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { requireAuth, optionalAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadSingleImage, ALLOWED_IMAGE_TYPES } from "../../middlewares/upload.middleware.js";
import { aiLimiter } from "../../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { AppError } from "../../utils/app-error.js";
import * as designsController from "./designs.controller.js";
import {
  createDesignSchema,
  updateDesignSchema,
  generateDesignSchema,
  textToDesignSchema,
  imageToDesignSchema,
  sketchToDesignSchema,
  designChatSchema,
  shareDesignSchema,
} from "./designs.validator.js";

export const designsRoutes = Router();

const designAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

const uploadDesignFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    if (ALLOWED_IMAGE_TYPES.includes(mime) || mime.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid image format: ${file.mimetype}`, 400));
    }
  },
}).fields([
  { name: "image", maxCount: 1 },
  { name: "sketch", maxCount: 1 },
  { name: "file", maxCount: 1 },
]);

/**
 * @openapi
 * /designs:
 *   get:
 *     summary: List user designs with optional filters
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: isFavorite
 *         schema: { type: boolean }
 *       - in: query
 *         name: isTrashed
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of designs retrieved successfully
 *   post:
 *     summary: Create or save a new design record
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               type: { type: string, enum: [text-to-design, image-to-design, sketch-to-design, manual] }
 *               prompt: { type: string }
 *               imageUrl: { type: string }
 *               colors: { type: array, items: { type: string } }
 *               fabric: { type: string }
 *               embroidery: { type: string }
 *               measurements: { type: object }
 *               notes: { type: string }
 *               isFavorite: { type: boolean }
 *               isTrashed: { type: boolean }
 *     responses:
 *       201:
 *         description: Design saved successfully
 */
designsRoutes.get("/designs", ...designAuth, asyncHandler(designsController.getDesigns));
designsRoutes.post("/designs", ...designAuth, validate(createDesignSchema), asyncHandler(designsController.createDesign));

/**
 * @openapi
 * /designs/templates:
 *   get:
 *     summary: Get curated AI design templates catalog
 *     tags: [Designs]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Design templates retrieved successfully
 */
designsRoutes.get("/designs/templates", optionalAuth, asyncHandler(designsController.getDesignTemplates));

/**
 * @openapi
 * /designs/generate:
 *   post:
 *     summary: Generate AI fashion design (supports text-to-design, image-to-design, and sketch-to-design)
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               mode: { type: string, enum: [text-to-design, image-to-design, sketch-to-design] }
 *               prompt: { type: string }
 *               imageUrl: { type: string }
 *               sketchUrl: { type: string }
 *               category: { type: string }
 *               fabricPreference: { type: string }
 *               colorPreference: { type: string }
 *     responses:
 *       201:
 *         description: AI design generated successfully
 */
designsRoutes.post("/designs/generate", ...designAuth, aiLimiter, uploadDesignFiles, validate(generateDesignSchema), asyncHandler(designsController.generateDesign));

/**
 * @openapi
 * /designs/chat:
 *   post:
 *     summary: Chat with AI Design Studio assistant for outfit concepts & styling
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *               designId: { type: string }
 *               generateImage: { type: boolean }
 *     responses:
 *       200:
 *         description: Assistant response returned
 */
designsRoutes.post("/designs/chat", ...designAuth, validate(designChatSchema), asyncHandler(designsController.designChat));

/**
 * @openapi
 * /designs/text-to-design:
 *   post:
 *     summary: Generate design concept from text prompt
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Design generated successfully
 */
designsRoutes.post("/designs/text-to-design", ...designAuth, aiLimiter, validate(textToDesignSchema), asyncHandler(designsController.textToDesign));

/**
 * @openapi
 * /designs/image-to-design:
 *   post:
 *     summary: Generate design variation from an uploaded image file or URL
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Design generated successfully
 */
designsRoutes.post("/designs/image-to-design", ...designAuth, aiLimiter, uploadSingleImage("image"), validate(imageToDesignSchema), asyncHandler(designsController.imageToDesign));

/**
 * @openapi
 * /designs/sketch-to-design:
 *   post:
 *     summary: Transform sketch image into a realistic fashion design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Design generated successfully
 */
designsRoutes.post("/designs/sketch-to-design", ...designAuth, aiLimiter, uploadSingleImage("sketch"), validate(sketchToDesignSchema), asyncHandler(designsController.sketchToDesign));

/**
 * @openapi
 * /designs/{designId}:
 *   get:
 *     summary: Get design details by ID
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Design details retrieved successfully
 *       404:
 *         description: Design not found
 *   patch:
 *     summary: Update design editor fields (title, fabric, colors, favorite/trash flags, notes)
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Design updated successfully
 *   delete:
 *     summary: Permanently delete a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Design deleted successfully
 */
designsRoutes.get("/designs/:designId", ...designAuth, asyncHandler(designsController.getDesignById));
designsRoutes.patch("/designs/:designId", ...designAuth, validate(updateDesignSchema), asyncHandler(designsController.updateDesign));
designsRoutes.delete("/designs/:designId", ...designAuth, asyncHandler(designsController.deleteDesign));

/**
 * @openapi
 * /designs/{designId}/tech-pack:
 *   get:
 *     summary: Generate and retrieve structured Tech Pack & PDF export for a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf] }
 *     responses:
 *       200:
 *         description: Tech pack generated successfully
 */
designsRoutes.get("/designs/:designId/tech-pack", ...designAuth, asyncHandler(designsController.getTechPack));

/**
 * @openapi
 * /designs/{designId}/duplicate:
 *   post:
 *     summary: Duplicate an existing design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Design duplicated successfully
 */
designsRoutes.post("/designs/:designId/duplicate", ...designAuth, asyncHandler(designsController.duplicateDesign));

/**
 * @openapi
 * /designs/{designId}/share-with-tailor:
 *   post:
 *     summary: Share design with a tailor
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Design shared with tailor successfully
 */
designsRoutes.post("/designs/:designId/share-with-tailor", ...designAuth, validate(shareDesignSchema), asyncHandler(designsController.shareWithTailor));

/**
 * @openapi
 * /designs/{designId}/chat:
 *   get:
 *     summary: Get chat history for a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *   post:
 *     summary: Send chat message in context of a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 */
designsRoutes.get("/designs/:designId/chat", ...designAuth, asyncHandler(designsController.getDesignChat));
designsRoutes.post("/designs/:designId/chat", ...designAuth, validate(designChatSchema), asyncHandler(designsController.postDesignChat));

/**
 * @openapi
 * /designs/{designId}/colors:
 *   patch:
 *     summary: Update design color palette
 *     tags: [Designs]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: array
 *                 items: { type: string }
 *               - type: object
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Design colors updated successfully
 * /designs/{designId}/fabric:
 *   patch:
 *     summary: Update design fabric selection and details
 *     tags: [Designs]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Design fabric updated successfully
 * /designs/{designId}/embroidery:
 *   patch:
 *     summary: Update design embroidery details and placement
 *     tags: [Designs]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Design embroidery updated successfully
 * /designs/{designId}/measurements:
 *   patch:
 *     summary: Attach or update measurements snapshot for a design
 *     tags: [Designs]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Design measurements updated successfully
 * /designs/{designId}/notes:
 *   patch:
 *     summary: Update design tailoring and styling notes
 *     tags: [Designs]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Design notes updated successfully
 */
designsRoutes.patch("/designs/:designId/colors", ...designAuth, validate(z.union([z.array(z.string()), z.record(z.unknown())])), asyncHandler(designsController.updateColors));
designsRoutes.patch("/designs/:designId/fabric", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateFabric));
designsRoutes.patch("/designs/:designId/embroidery", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateEmbroidery));
designsRoutes.patch("/designs/:designId/measurements", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateMeasurements));
designsRoutes.patch("/designs/:designId/notes", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateNotes));

/**
 * @openapi
 * /designs/{designId}/export-pdf:
 *   post:
 *     summary: Export design specification to PDF
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: PDF generated and export URL returned
 */
designsRoutes.post("/designs/:designId/export-pdf", ...designAuth, asyncHandler(designsController.exportPdf));

/**
 * @openapi
 * /designs/{designId}/pdf:
 *   get:
 *     summary: Get PDF export URL for a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: PDF details retrieved
 */
designsRoutes.get("/designs/:designId/pdf", ...designAuth, asyncHandler(designsController.getDesignPdf));

/**
 * @openapi
 * /exports:
 *   get:
 *     summary: List all user PDF exports
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Exports list retrieved successfully
 */
designsRoutes.get("/exports", ...designAuth, asyncHandler(designsController.getExports));
