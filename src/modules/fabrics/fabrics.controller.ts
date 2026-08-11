import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { fabricsService } from "./fabrics.service.js";

export const getFabrics: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await fabricsService.getFabrics(page, limit);
  paginated(res, result.records, page, limit, result.total, "Fabrics fetched successfully");
};

export const createFabric: RequestHandler = async (req, res) => {
  const created = await fabricsService.createFabric(req.user?.id, req.userRole, req.body);
  success(res, created, "Fabric added successfully", 201);
};

export const getFabricById: RequestHandler = async (req, res) => {
  const fabric = await fabricsService.getFabricById(asString(req.params.fabricId));
  success(res, fabric, "Fabric fetched successfully");
};

export const updateFabric: RequestHandler = async (req, res) => {
  const updated = await fabricsService.updateFabric(asString(req.params.fabricId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Fabric updated successfully");
};

export const deleteFabric: RequestHandler = async (req, res) => {
  await fabricsService.deleteFabric(asString(req.params.fabricId), req.user?.id, req.userRole);
  success(res, null, "Fabric deleted successfully");
};
