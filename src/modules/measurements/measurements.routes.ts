import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { measurementsService } from "./measurements.service.js";

export const measurementsRoutes = Router();

const measurementAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

measurementsRoutes.get(
  "/measurements",
  ...measurementAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await measurementsService.getMeasurements(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Measurements fetched successfully");
  }),
);

measurementsRoutes.post(
  "/measurements",
  ...measurementAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await measurementsService.createMeasurement(req.user?.id, req.userRole, req.body);
    success(res, created, "Measurement created successfully", 201);
  }),
);

measurementsRoutes.get(
  "/measurements/:measurementId",
  ...measurementAuth,
  asyncHandler(async (req, res) => {
    const measurement = await measurementsService.getMeasurementById(asString(req.params.measurementId), req.user?.id, req.userRole);
    success(res, measurement, "Measurement fetched successfully");
  }),
);

measurementsRoutes.patch(
  "/measurements/:measurementId",
  ...measurementAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await measurementsService.updateMeasurement(asString(req.params.measurementId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Measurement updated successfully");
  }),
);

measurementsRoutes.delete(
  "/measurements/:measurementId",
  ...measurementAuth,
  asyncHandler(async (req, res) => {
    await measurementsService.deleteMeasurement(asString(req.params.measurementId), req.user?.id, req.userRole);
    success(res, null, "Measurement deleted successfully");
  }),
);
