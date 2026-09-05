import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as fabricsController from "./fabrics.controller.js";
import { createFabricSchema, updateFabricSchema } from "./fabrics.validator.js";

export const fabricsRoutes = Router();

/**
 * @openapi
 * /fabrics:
 *   get:
 *     summary: List available fabrics
 *     tags: [Fabrics]
 *     parameters:
 *       - in: query
 *         name: material
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fabrics catalog retrieved successfully
 *   post:
 *     summary: Add new fabric to catalog
 *     tags: [Fabrics]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, material, pricePerMeter]
 *             properties:
 *               name:
 *                 type: string
 *               material:
 *                 type: string
 *               pricePerMeter:
 *                 type: number
 *               color:
 *                 type: string
 *               pattern:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               inStock:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Fabric created successfully
 */
fabricsRoutes.get("/fabrics", asyncHandler(fabricsController.getFabrics));
fabricsRoutes.post("/fabrics", requireAuth, requireRole("tailor", "admin"), validate(createFabricSchema), asyncHandler(fabricsController.createFabric));

/**
 * @openapi
 * /fabrics/{fabricId}:
 *   get:
 *     summary: Get fabric details by ID
 *     tags: [Fabrics]
 *     parameters:
 *       - in: path
 *         name: fabricId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fabric details retrieved successfully
 *       404:
 *         description: Fabric not found
 *   patch:
 *     summary: Update fabric details
 *     tags: [Fabrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fabricId
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
 *               name:
 *                 type: string
 *               material:
 *                 type: string
 *               pricePerMeter:
 *                 type: number
 *               color:
 *                 type: string
 *               pattern:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 format: uri
 *               inStock:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Fabric updated successfully
 *   delete:
 *     summary: Delete fabric from catalog
 *     tags: [Fabrics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fabricId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fabric deleted successfully
 */
fabricsRoutes.get("/fabrics/:fabricId", asyncHandler(fabricsController.getFabricById));
fabricsRoutes.patch("/fabrics/:fabricId", requireAuth, requireRole("tailor", "admin"), validate(updateFabricSchema), asyncHandler(fabricsController.updateFabric));
fabricsRoutes.delete("/fabrics/:fabricId", requireAuth, requireRole("tailor", "admin"), asyncHandler(fabricsController.deleteFabric));
