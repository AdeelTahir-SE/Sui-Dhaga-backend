import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { fabricsService } from "./fabrics.service.js";

export const listFabrics: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));
  const result = await fabricsService.listFabrics({
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    season: typeof req.query.season === "string" ? req.query.season : undefined,
    search: typeof req.query.search === "string" ? req.query.search : undefined,
    page,
    limit,
  });
  paginated(res, result.records, page, limit, result.total, "Fabrics catalog fetched successfully");
};

export const getFabricById: RequestHandler = async (req, res) => {
  const fabric = await fabricsService.getFabricById(asString(req.params.fabricId));
  success(res, fabric, "Fabric details fetched successfully");
};

export const createFabric: RequestHandler = async (req, res) => {
  const created = await fabricsService.createFabric(req.body);
  success(res, created, "Fabric created successfully", 201);
};

export const updateFabric: RequestHandler = async (req, res) => {
  const updated = await fabricsService.updateFabric(asString(req.params.fabricId), req.body);
  success(res, updated, "Fabric updated successfully");
};

export const deleteFabric: RequestHandler = async (req, res) => {
  await fabricsService.deleteFabric(asString(req.params.fabricId));
  success(res, null, "Fabric deleted successfully");
};
