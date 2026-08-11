import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as measurementsController from "./measurements.controller.js";
import { createMeasurementSchema, updateMeasurementSchema } from "./measurements.validator.js";

export const measurementsRoutes = Router();

const measurementAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

measurementsRoutes.get("/measurements", ...measurementAuth, asyncHandler(measurementsController.getMeasurements));
measurementsRoutes.post("/measurements", requireAuth, requireRole("customer", "admin"), validate(createMeasurementSchema), asyncHandler(measurementsController.createMeasurement));
measurementsRoutes.get("/measurements/:measurementId", ...measurementAuth, asyncHandler(measurementsController.getMeasurementById));
measurementsRoutes.patch("/measurements/:measurementId", ...measurementAuth, validate(updateMeasurementSchema), asyncHandler(measurementsController.updateMeasurement));
measurementsRoutes.delete("/measurements/:measurementId", ...measurementAuth, asyncHandler(measurementsController.deleteMeasurement));
