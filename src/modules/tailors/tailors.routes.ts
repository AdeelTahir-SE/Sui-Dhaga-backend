import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { tailorsService } from "./tailors.service.js";

export const tailorsRoutes = Router();

tailorsRoutes.get(
  "/tailors",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await tailorsService.getTailors(page, limit);
    paginated(res, result.records, page, limit, result.total, "Tailors fetched successfully");
  }),
);

tailorsRoutes.get(
  "/tailors/nearby",
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await tailorsService.getTailors(page, limit);
    paginated(res, result.records, page, limit, result.total, "Nearby tailors fetched successfully");
  }),
);

tailorsRoutes.get(
  "/tailors/map",
  asyncHandler(async (_req, res) => {
    const result = await tailorsService.getTailors(1, 100);
    success(res, result.records, "Tailors map data fetched successfully");
  }),
);

tailorsRoutes.get(
  "/tailors/:tailorId",
  asyncHandler(async (req, res) => {
    const tailor = await tailorsService.getTailorById(asString(req.params.tailorId));
    success(res, tailor, "Tailor fetched successfully");
  }),
);

tailorsRoutes.get(
  "/tailors/:tailorId/services",
  asyncHandler(async (req, res) => {
    const services = await tailorsService.getTailorServices(asString(req.params.tailorId));
    success(res, services, "Tailor services fetched successfully");
  }),
);

tailorsRoutes.get(
  "/tailors/:tailorId/availability",
  asyncHandler(async (req, res) => {
    const availability = await tailorsService.getTailorAvailability(asString(req.params.tailorId));
    success(res, availability, "Tailor availability fetched successfully");
  }),
);

tailorsRoutes.get(
  "/tailors/:tailorId/reviews",
  asyncHandler(async (req, res) => {
    const tailor = await tailorsService.getTailorById(asString(req.params.tailorId));
    success(res, tailor ? (tailor as Record<string, unknown>).reviews ?? [] : [], "Tailor reviews fetched successfully");
  }),
);

tailorsRoutes.post(
  "/tailors",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await tailorsService.createTailor(req.user?.id, req.userRole, req.body);
    success(res, created, "Tailor profile created successfully", 201);
  }),
);

tailorsRoutes.patch(
  "/tailors/:tailorId",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Tailor profile updated successfully");
  }),
);

tailorsRoutes.delete(
  "/tailors/:tailorId",
  requireAuth,
  requireRole("tailor", "admin"),
  asyncHandler(async (req, res) => {
    await tailorsService.deleteTailor(asString(req.params.tailorId), req.user?.id, req.userRole);
    success(res, null, "Tailor profile deleted successfully");
  }),
);

tailorsRoutes.post(
  "/tailors/:tailorId/gallery",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Gallery image added successfully", 201);
  }),
);

tailorsRoutes.delete(
  "/tailors/:tailorId/gallery/:imageId",
  requireAuth,
  requireRole("tailor", "admin"),
  asyncHandler(async (req, res) => {
    await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, { removeImageId: asString(req.params.imageId) });
    success(res, null, "Gallery image deleted successfully");
  }),
);

tailorsRoutes.post(
  "/tailors/:tailorId/verify",
  requireAuth,
  requireRole("tailor", "admin"),
  asyncHandler(async (req, res) => {
    const updated = await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, { verified: true });
    success(res, updated, "Verification requested successfully");
  }),
);

tailorsRoutes.post(
  "/tailors/compare",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    success(res, { comparison: req.body }, "Tailors compared successfully");
  }),
);

tailorsRoutes.post(
  "/tailors/:tailorId/services",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await tailorsService.addTailorService(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
    success(res, created, "Service added successfully", 201);
  }),
);

tailorsRoutes.patch(
  "/tailors/:tailorId/services/:serviceId",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await tailorsService.updateTailorService(asString(req.params.serviceId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Service updated successfully");
  }),
);

tailorsRoutes.delete(
  "/tailors/:tailorId/services/:serviceId",
  requireAuth,
  requireRole("tailor", "admin"),
  asyncHandler(async (req, res) => {
    await tailorsService.deleteTailorService(asString(req.params.serviceId), req.user?.id, req.userRole);
    success(res, null, "Service deleted successfully");
  }),
);

tailorsRoutes.post(
  "/tailors/:tailorId/availability",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await tailorsService.addTailorAvailability(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
    success(res, created, "Availability slot created successfully", 201);
  }),
);

tailorsRoutes.patch(
  "/availability/:slotId",
  requireAuth,
  requireRole("tailor", "admin"),
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await tailorsService.updateAvailabilitySlot(asString(req.params.slotId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Availability slot updated successfully");
  }),
);

tailorsRoutes.delete(
  "/availability/:slotId",
  requireAuth,
  requireRole("tailor", "admin"),
  asyncHandler(async (req, res) => {
    await tailorsService.deleteAvailabilitySlot(asString(req.params.slotId), req.user?.id, req.userRole);
    success(res, null, "Availability slot deleted successfully");
  }),
);
