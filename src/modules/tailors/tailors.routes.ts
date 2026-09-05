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

/**
 * @swagger
 * /tailors:
 *   get:
 *     summary: List all tailors with pagination and ratings
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated list of tailors
 *   post:
 *     summary: Create a tailor profile for current user
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shopName, specialties, city]
 *             properties:
 *               shopName: { type: string, example: "Royal Heritage Tailors" }
 *               specialties: { type: array, items: { type: string }, example: ["bridal", "lehenga"] }
 *               city: { type: string, example: "Lahore" }
 *               address: { type: string, example: "Shop 12, Anarkali Bazaar" }
 *               experienceYears: { type: integer, example: 10 }
 *               bio: { type: string }
 *     responses:
 *       201:
 *         description: Tailor profile created successfully
 */
tailorsRoutes.get("/tailors", asyncHandler(tailorsController.getTailors));
tailorsRoutes.post("/tailors", requireAuth, requireRole("tailor", "admin"), validate(createTailorSchema), asyncHandler(tailorsController.createTailor));

/**
 * @swagger
 * /tailors/nearby:
 *   get:
 *     summary: Get nearby tailors based on location
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Nearby tailors list
 */
tailorsRoutes.get("/tailors/nearby", asyncHandler(tailorsController.getNearbyTailors));

/**
 * @swagger
 * /tailors/map:
 *   get:
 *     summary: Get tailors map coordinates and pins
 *     tags: [Tailors]
 *     security: []
 *     responses:
 *       200:
 *         description: Tailors map pin coordinates
 */
tailorsRoutes.get("/tailors/map", asyncHandler(tailorsController.getTailorsMap));

/**
 * @swagger
 * /tailors/compare:
 *   post:
 *     summary: Compare multiple tailors side by side
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tailorIds]
 *             properties:
 *               tailorIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200:
 *         description: Comparison data returned
 */
tailorsRoutes.post("/tailors/compare", requireAuth, validate(tailorsCompareSchema), asyncHandler(tailorsController.compareTailors));

/**
 * @swagger
 * /tailors/{tailorId}:
 *   get:
 *     summary: Get full tailor profile, services, availability, gallery, and reviews
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full tailor details
 *   patch:
 *     summary: Update tailor profile
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shopName: { type: string }
 *               specialties: { type: array, items: { type: string } }
 *               city: { type: string }
 *               bio: { type: string }
 *     responses:
 *       200:
 *         description: Tailor profile updated
 *   delete:
 *     summary: Delete tailor profile
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tailor deleted
 */
tailorsRoutes.get("/tailors/:tailorId", asyncHandler(tailorsController.getTailorById));
tailorsRoutes.patch("/tailors/:tailorId", requireAuth, requireRole("tailor", "admin"), validate(updateTailorSchema), asyncHandler(tailorsController.updateTailor));
tailorsRoutes.delete("/tailors/:tailorId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteTailor));

/**
 * @swagger
 * /tailors/{tailorId}/services:
 *   get:
 *     summary: Get all services offered by a tailor
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of tailor services
 *   post:
 *     summary: Add a new service to tailor catalog
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, price]
 *             properties:
 *               title: { type: string, example: "Lehenga Stitching" }
 *               price: { type: number, example: 15000 }
 *               description: { type: string }
 *               category: { type: string, example: "bridal" }
 *     responses:
 *       201:
 *         description: Service created
 */
tailorsRoutes.get("/tailors/:tailorId/services", asyncHandler(tailorsController.getTailorServices));
tailorsRoutes.post("/tailors/:tailorId/services", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema), asyncHandler(tailorsController.addTailorService));

/**
 * @swagger
 * /tailors/{tailorId}/services/{serviceId}:
 *   patch:
 *     summary: Update an existing tailor service
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Service updated
 *   delete:
 *     summary: Delete a tailor service
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Service deleted
 */
tailorsRoutes.patch("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema.partial()), asyncHandler(tailorsController.updateTailorService));
tailorsRoutes.delete("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteTailorService));

/**
 * @swagger
 * /tailors/{tailorId}/availability:
 *   get:
 *     summary: Get tailor weekly availability schedule
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Availability slots
 *   post:
 *     summary: Add availability schedule slot
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [dayOfWeek, startTime, endTime]
 *             properties:
 *               dayOfWeek: { type: string, example: "Monday" }
 *               startTime: { type: string, example: "10:00" }
 *               endTime: { type: string, example: "19:00" }
 *               isAvailable: { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Availability slot added
 */
tailorsRoutes.get("/tailors/:tailorId/availability", asyncHandler(tailorsController.getTailorAvailability));
tailorsRoutes.post("/tailors/:tailorId/availability", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySchema), asyncHandler(tailorsController.addTailorAvailability));

/**
 * @swagger
 * /availability/{slotId}:
 *   patch:
 *     summary: Update an availability slot
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Slot updated
 *   delete:
 *     summary: Delete an availability slot
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: slotId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Slot deleted
 */
tailorsRoutes.patch("/availability/:slotId", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySchema.partial()), asyncHandler(tailorsController.updateAvailabilitySlot));
tailorsRoutes.delete("/availability/:slotId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteAvailabilitySlot));

/**
 * @swagger
 * /tailors/{tailorId}/reviews:
 *   get:
 *     summary: Get reviews for a specific tailor
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Tailor reviews list
 */
tailorsRoutes.get("/tailors/:tailorId/reviews", asyncHandler(tailorsController.getTailorReviews));

/**
 * @swagger
 * /tailors/{tailorId}/gallery:
 *   post:
 *     summary: Add an image to tailor portfolio gallery
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageUrl]
 *             properties:
 *               imageUrl: { type: string, format: uri }
 *               caption: { type: string }
 *     responses:
 *       201:
 *         description: Gallery image added
 */
tailorsRoutes.post("/tailors/:tailorId/gallery", requireAuth, requireRole("tailor", "admin"), validate(addGalleryImageSchema), asyncHandler(tailorsController.addGalleryImage));

/**
 * @swagger
 * /tailors/{tailorId}/gallery/{imageId}:
 *   delete:
 *     summary: Delete an image from tailor portfolio gallery
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Gallery image deleted
 */
tailorsRoutes.delete("/tailors/:tailorId/gallery/:imageId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteGalleryImage));

/**
 * @swagger
 * /tailors/{tailorId}/verify:
 *   post:
 *     summary: Request verification badge for tailor profile
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Verification requested
 */
tailorsRoutes.post("/tailors/:tailorId/verify", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.requestVerification));

