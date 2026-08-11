import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { measurementsService } from "./measurements.service.js";

export const getMeasurements: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await measurementsService.getMeasurements(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Measurements fetched successfully");
};

export const createMeasurement: RequestHandler = async (req, res) => {
  const created = await measurementsService.createMeasurement(req.user?.id, req.userRole, req.body);
  success(res, created, "Measurement profile created successfully", 201);
};

export const getMeasurementById: RequestHandler = async (req, res) => {
  const measurement = await measurementsService.getMeasurementById(asString(req.params.measurementId), req.user?.id, req.userRole);
  success(res, measurement, "Measurement fetched successfully");
};

export const updateMeasurement: RequestHandler = async (req, res) => {
  const updated = await measurementsService.updateMeasurement(asString(req.params.measurementId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Measurement updated successfully");
};

export const deleteMeasurement: RequestHandler = async (req, res) => {
  await measurementsService.deleteMeasurement(asString(req.params.measurementId), req.user?.id, req.userRole);
  success(res, null, "Measurement deleted successfully");
};
