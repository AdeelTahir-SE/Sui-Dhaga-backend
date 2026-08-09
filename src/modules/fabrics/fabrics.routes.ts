import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { fabricsService } from "./fabrics.service.js";

export const fabricsRoutes = Router();

fabricsRoutes.get(
  "/fabrics",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await fabricsService.getFabrics(page, limit);
    paginated(res, result.records, page, limit, result.total, "Fabrics fetched successfully");
  }),
);

fabricsRoutes.get(
  "/fabrics/:fabricId",
  asyncHandler(async (req, res) => {
    const fabric = await fabricsService.getFabricById(asString(req.params.fabricId));
    success(res, fabric, "Fabric fetched successfully");
  }),
);

fabricsRoutes.post(
  "/fabrics",
  requireAuth,
  requireRole("admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await fabricsService.createFabric(req.user?.id, req.userRole, req.body);
    success(res, created, "Fabric created successfully", 201);
  }),
);

fabricsRoutes.patch(
  "/fabrics/:fabricId",
  requireAuth,
  requireRole("admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await fabricsService.updateFabric(asString(req.params.fabricId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Fabric updated successfully");
  }),
);

fabricsRoutes.delete(
  "/fabrics/:fabricId",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    await fabricsService.deleteFabric(asString(req.params.fabricId), req.user?.id, req.userRole);
    success(res, null, "Fabric deleted successfully");
  }),
);
