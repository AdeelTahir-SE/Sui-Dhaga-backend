import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as designsController from "./designs.controller.js";

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
 */
designsRoutes.get("/designs/:designId", ...designAuth, asyncHandler(designsController.getDesignById));
