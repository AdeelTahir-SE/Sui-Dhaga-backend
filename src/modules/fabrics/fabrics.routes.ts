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
 *     summary: Browse fabrics catalog with category, season, and search filters
 *     tags: [Fabrics]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: season
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Fabrics catalog fetched successfully
 *   post:
 *     summary: Create a fabric entry in catalog (Admin only)
 *     tags: [Fabrics]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Fabric created
 * /fabrics/{fabricId}:
 *   get:
 *     summary: Get fabric details by ID or slug
 *     tags: [Fabrics]
 *     parameters:
 *       - in: path
 *         name: fabricId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Fabric details fetched
 */
fabricsRoutes.get("/fabrics", asyncHandler(fabricsController.listFabrics));
fabricsRoutes.get("/fabrics/:fabricId", asyncHandler(fabricsController.getFabricById));
fabricsRoutes.post(
  "/fabrics",
  requireAuth,
  requireRole("admin"),
  validate(createFabricSchema),
  asyncHandler(fabricsController.createFabric)
);
fabricsRoutes.patch(
  "/fabrics/:fabricId",
  requireAuth,
  requireRole("admin"),
  validate(updateFabricSchema),
  asyncHandler(fabricsController.updateFabric)
);
fabricsRoutes.delete(
  "/fabrics/:fabricId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(fabricsController.deleteFabric)
);
