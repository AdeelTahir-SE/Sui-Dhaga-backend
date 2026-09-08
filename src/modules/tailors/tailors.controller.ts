import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { tailorsService } from "./tailors.service.js";

export const getTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await tailorsService.getTailors(page, limit);
  paginated(res, result.records, page, limit, result.total, "Tailors fetched successfully");
};

export const getNearbyTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await tailorsService.getTailors(page, limit);
  paginated(res, result.records, page, limit, result.total, "Nearby tailors fetched successfully");
};

export const getTailorsMap: RequestHandler = async (_req, res) => {
  const result = await tailorsService.getTailors(1, 100);
  success(res, result.records, "Tailors map data fetched successfully");
};

export const getTailorById: RequestHandler = async (req, res) => {
  const tailor = await tailorsService.getTailorById(asString(req.params.tailorId));
  success(res, tailor, "Tailor fetched successfully");
};

export const getTailorServices: RequestHandler = async (req, res) => {
  const services = await tailorsService.getTailorServices(asString(req.params.tailorId));
  success(res, services, "Tailor services fetched successfully");
};

export const getTailorAvailability: RequestHandler = async (req, res) => {
  const availability = await tailorsService.getTailorAvailability(asString(req.params.tailorId));
  success(res, availability, "Tailor availability fetched successfully");
};

export const getTailorReviews: RequestHandler = async (req, res) => {
  const tailor = await tailorsService.getTailorById(asString(req.params.tailorId));
  success(res, tailor ? (tailor as Record<string, unknown>).reviews ?? [] : [], "Tailor reviews fetched successfully");
};

export const createTailor: RequestHandler = async (req, res) => {
  const created = await tailorsService.createTailor(req.user?.id, req.userRole, req.body);
  success(res, created, "Tailor profile created successfully", 201);
};

export const updateTailor: RequestHandler = async (req, res) => {
  const updated = await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Tailor profile updated successfully");
};

export const deleteTailor: RequestHandler = async (req, res) => {
  await tailorsService.deleteTailor(asString(req.params.tailorId), req.user?.id, req.userRole);
  success(res, null, "Tailor profile deleted successfully");
};

export const addGalleryImage: RequestHandler = async (req, res) => {
  const updated = await tailorsService.addGalleryImage(asString(req.params.tailorId), req.user?.id, req.userRole, req.file, req.body);
  success(res, updated, "Gallery image added successfully", 201);
};

export const deleteGalleryImage: RequestHandler = async (req, res) => {
  await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, { removeImageId: asString(req.params.imageId) });
  success(res, null, "Gallery image deleted successfully");
};

export const requestVerification: RequestHandler = async (req, res) => {
  const updated = await tailorsService.requestVerification(asString(req.params.tailorId), req.user?.id, req.userRole, req.file, req.body);
  success(res, updated, "Verification requested successfully");
};

export const compareTailors: RequestHandler = async (req, res) => {
  success(res, { comparison: req.body }, "Tailors compared successfully");
};

export const addTailorService: RequestHandler = async (req, res) => {
  const created = await tailorsService.addTailorService(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, created, "Service added successfully", 201);
};

export const updateTailorService: RequestHandler = async (req, res) => {
  const updated = await tailorsService.updateTailorService(asString(req.params.serviceId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Service updated successfully");
};

export const deleteTailorService: RequestHandler = async (req, res) => {
  await tailorsService.deleteTailorService(asString(req.params.serviceId), req.user?.id, req.userRole);
  success(res, null, "Service deleted successfully");
};

export const addTailorAvailability: RequestHandler = async (req, res) => {
  const created = await tailorsService.addTailorAvailability(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, created, "Availability slot created successfully", 201);
};

export const updateAvailabilitySlot: RequestHandler = async (req, res) => {
  const updated = await tailorsService.updateAvailabilitySlot(asString(req.params.slotId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Availability slot updated successfully");
};

export const deleteAvailabilitySlot: RequestHandler = async (req, res) => {
  await tailorsService.deleteAvailabilitySlot(asString(req.params.slotId), req.user?.id, req.userRole);
  success(res, null, "Availability slot deleted successfully");
};
