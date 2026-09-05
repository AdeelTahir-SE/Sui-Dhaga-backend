import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { aiLimiter } from "../../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as designsController from "./designs.controller.js";
import {
  textToDesignSchema,
  imageToDesignSchema,
  sketchToDesignSchema,
  designChatSchema,
  updateDesignSchema,
  shareDesignSchema,
} from "./designs.validator.js";

export const designsRoutes = Router();

const designAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

/**
 * @openapi
 * /designs:
 *   get:
 *     summary: List user designs
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of designs retrieved successfully
 */
designsRoutes.get("/designs", ...designAuth, asyncHandler(designsController.getDesigns));

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
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Design details retrieved successfully
 *       404:
 *         description: Design not found
 *   patch:
 *     summary: Update design details
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               prompt:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               colors:
 *                 type: array
 *                 items:
 *                   type: string
 *               fabric:
 *                 type: string
 *               embroidery:
 *                 type: string
 *               measurements:
 *                 type: object
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Design updated successfully
 *   delete:
 *     summary: Delete a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Design deleted successfully
 */
designsRoutes.get("/designs/:designId", ...designAuth, asyncHandler(designsController.getDesignById));
designsRoutes.patch("/designs/:designId", ...designAuth, validate(updateDesignSchema), asyncHandler(designsController.updateDesign));
designsRoutes.delete("/designs/:designId", ...designAuth, asyncHandler(designsController.deleteDesign));

/**
 * @openapi
 * /designs/text-to-design:
 *   post:
 *     summary: Generate design concept from text prompt
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *               category:
 *                 type: string
 *               fabricPreference:
 *                 type: string
 *               colorPreference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Design generated successfully
 */
designsRoutes.post("/designs/text-to-design", ...designAuth, aiLimiter, validate(textToDesignSchema), asyncHandler(designsController.textToDesign));

/**
 * @openapi
 * /designs/image-to-design:
 *   post:
 *     summary: Generate design variation from an image URL
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageUrl]
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               instructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Design generated successfully
 */
designsRoutes.post("/designs/image-to-design", ...designAuth, aiLimiter, validate(imageToDesignSchema), asyncHandler(designsController.imageToDesign));

/**
 * @openapi
 * /designs/sketch-to-design:
 *   post:
 *     summary: Transform sketch image into a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sketchUrl]
 *             properties:
 *               sketchUrl:
 *                 type: string
 *                 format: uri
 *               instructions:
 *                 type: string
 *     responses:
 *       201:
 *         description: Design generated successfully
 */
designsRoutes.post("/designs/sketch-to-design", ...designAuth, aiLimiter, validate(sketchToDesignSchema), asyncHandler(designsController.sketchToDesign));

/**
 * @openapi
 * /designs/chat:
 *   post:
 *     summary: Chat with AI design assistant
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
 *               message:
 *                 type: string
 *               designId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Assistant response received
 */
designsRoutes.post("/designs/chat", ...designAuth, validate(designChatSchema), asyncHandler(designsController.designChat));

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
 *         schema:
 *           type: string
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
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tailorId]
 *             properties:
 *               tailorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Design shared with tailor successfully
 */
designsRoutes.post("/designs/:designId/share-with-tailor", ...designAuth, validate(shareDesignSchema), asyncHandler(designsController.shareWithTailor));

/**
 * @openapi
 * /designs/{designId}/chat:
 *   get:
 *     summary: Get chat history for a specific design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chat history retrieved
 *   post:
 *     summary: Send chat message for a specific design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Message processed
 */
designsRoutes.get("/designs/:designId/chat", ...designAuth, asyncHandler(designsController.getDesignChat));
designsRoutes.post("/designs/:designId/chat", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.postDesignChat));

/**
 * @openapi
 * /designs/{designId}/colors:
 *   patch:
 *     summary: Update design colors
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Colors updated
 */
designsRoutes.patch("/designs/:designId/colors", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateColors));

/**
 * @openapi
 * /designs/{designId}/fabric:
 *   patch:
 *     summary: Update design fabric
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Fabric updated
 */
designsRoutes.patch("/designs/:designId/fabric", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateFabric));

/**
 * @openapi
 * /designs/{designId}/embroidery:
 *   patch:
 *     summary: Update design embroidery
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Embroidery updated
 */
designsRoutes.patch("/designs/:designId/embroidery", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateEmbroidery));

/**
 * @openapi
 * /designs/{designId}/measurements:
 *   patch:
 *     summary: Update design measurements
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Measurements updated
 */
designsRoutes.patch("/designs/:designId/measurements", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateMeasurements));

/**
 * @openapi
 * /designs/{designId}/notes:
 *   patch:
 *     summary: Update design notes
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notes updated
 */
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
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF generated and export URL returned
 */
designsRoutes.post("/designs/:designId/export-pdf", ...designAuth, asyncHandler(designsController.exportPdf));

/**
 * @openapi
 * /designs/{designId}/pdf:
 *   get:
 *     summary: Get existing PDF export for a design
 *     tags: [Designs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: designId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: PDF retrieved
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
