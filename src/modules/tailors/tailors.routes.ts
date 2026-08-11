import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as tailorsController from "./tailors.controller.js";
import {
  createTailorSchema,
  updateTailorSchema,
  addGalleryImageSchema,
  tailorServiceSchema,
  tailorAvailabilitySchema,
  tailorsCompareSchema,
} from "./tailors.validator.js";

export const tailorsRoutes = Router();

tailorsRoutes.get("/tailors", asyncHandler(tailorsController.getTailors));
tailorsRoutes.get("/tailors/nearby", asyncHandler(tailorsController.getNearbyTailors));
tailorsRoutes.get("/tailors/map", asyncHandler(tailorsController.getTailorsMap));
tailorsRoutes.get("/tailors/:tailorId", asyncHandler(tailorsController.getTailorById));
tailorsRoutes.get("/tailors/:tailorId/services", asyncHandler(tailorsController.getTailorServices));
tailorsRoutes.get("/tailors/:tailorId/availability", asyncHandler(tailorsController.getTailorAvailability));
tailorsRoutes.get("/tailors/:tailorId/reviews", asyncHandler(tailorsController.getTailorReviews));

tailorsRoutes.post("/tailors", requireAuth, requireRole("tailor", "admin"), validate(createTailorSchema), asyncHandler(tailorsController.createTailor));
tailorsRoutes.patch("/tailors/:tailorId", requireAuth, requireRole("tailor", "admin"), validate(updateTailorSchema), asyncHandler(tailorsController.updateTailor));
tailorsRoutes.delete("/tailors/:tailorId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteTailor));

tailorsRoutes.post("/tailors/:tailorId/gallery", requireAuth, requireRole("tailor", "admin"), validate(addGalleryImageSchema), asyncHandler(tailorsController.addGalleryImage));
tailorsRoutes.delete("/tailors/:tailorId/gallery/:imageId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteGalleryImage));
tailorsRoutes.post("/tailors/:tailorId/verify", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.requestVerification));
tailorsRoutes.post("/tailors/compare", requireAuth, validate(tailorsCompareSchema), asyncHandler(tailorsController.compareTailors));

tailorsRoutes.post("/tailors/:tailorId/services", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema), asyncHandler(tailorsController.addTailorService));
tailorsRoutes.patch("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema.partial()), asyncHandler(tailorsController.updateTailorService));
tailorsRoutes.delete("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteTailorService));

tailorsRoutes.post("/tailors/:tailorId/availability", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySchema), asyncHandler(tailorsController.addTailorAvailability));
tailorsRoutes.patch("/availability/:slotId", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySchema.partial()), asyncHandler(tailorsController.updateAvailabilitySlot));
tailorsRoutes.delete("/availability/:slotId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteAvailabilitySlot));
