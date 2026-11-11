import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadSingleImage } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as tailorsController from "./tailors.controller.js";
import {
  createTailorSchema,
  updateTailorSchema,
  uploadTailorBannerSchema,
  addGalleryImageSchema,
  tailorServiceSchema,
  tailorAvailabilitySchema,
  tailorAvailabilitySlotSchema,
  blockedDatesSchema,
  payoutSettingsSchema,
  payoutRequestSchema,
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
 */
/**
 * @swagger
 * /tailors/payouts:
 *   get:
 *     summary: Get tailor earnings summary, available balance, and payout history
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tailor payouts and balance summary
 *   post:
 *     summary: Request a payout withdrawal for available tailor earnings
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, example: 15000 }
 *               provider: { type: string, enum: [bank_transfer, jazzcash, easypaisa, sadapay, nayapay, stripe] }
 *               accountTitle: { type: string }
 *               accountNumber: { type: string }
 *               bankName: { type: string }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Payout request submitted
 * /tailors/payout-settings:
 *   get:
 *     summary: Get saved payout bank/wallet settings for authenticated tailor
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Payout settings retrieved
 *   put:
 *     summary: Save or update payout bank/wallet settings for authenticated tailor
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               provider: { type: string, enum: [bank_transfer, jazzcash, easypaisa, sadapay, nayapay, stripe] }
 *               accountTitle: { type: string }
 *               accountNumber: { type: string }
 *               bankName: { type: string }
 *               iban: { type: string }
 *               walletPhone: { type: string }
 *               autoPayout: { type: boolean }
 *     responses:
 *       200:
 *         description: Payout settings saved
 */
tailorsRoutes.get("/tailors/me", requireAuth, asyncHandler(tailorsController.getMyTailorProfile));
tailorsRoutes.get("/tailors/earnings", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.getPayouts));
tailorsRoutes.get("/tailors/payouts", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.getPayouts));
tailorsRoutes.post("/tailors/payouts", requireAuth, requireRole("tailor", "admin"), validate(payoutRequestSchema), asyncHandler(tailorsController.requestPayout));
tailorsRoutes.get("/tailors/payout-settings", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.getPayoutSettings));
tailorsRoutes.put("/tailors/payout-settings", requireAuth, requireRole("tailor", "admin"), validate(payoutSettingsSchema), asyncHandler(tailorsController.upsertPayoutSettings));
tailorsRoutes.patch("/tailors/payout-settings", requireAuth, requireRole("tailor", "admin"), validate(payoutSettingsSchema), asyncHandler(tailorsController.upsertPayoutSettings));
tailorsRoutes.get("/tailors/payouts/settings", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.getPayoutSettings));
tailorsRoutes.put("/tailors/payouts/settings", requireAuth, requireRole("tailor", "admin"), validate(payoutSettingsSchema), asyncHandler(tailorsController.upsertPayoutSettings));
tailorsRoutes.patch("/tailors/payouts/settings", requireAuth, requireRole("tailor", "admin"), validate(payoutSettingsSchema), asyncHandler(tailorsController.upsertPayoutSettings));
tailorsRoutes.get("/tailors/:tailorId", asyncHandler(tailorsController.getTailorById));
tailorsRoutes.patch("/tailors/:tailorId", requireAuth, requireRole("tailor", "admin"), validate(updateTailorSchema), asyncHandler(tailorsController.updateTailor));

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
 *         schema: { type: string }
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
 *         schema: { type: string }
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
/**
 * @swagger
 * /tailors/{tailorId}/services/{serviceId}:
 *   patch:
 *     summary: Update a tailor service
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               price: { type: number }
 *               description: { type: string }
 *               category: { type: string }
 *               isActive: { type: boolean }
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
 *         schema: { type: string }
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Service deleted
 */
tailorsRoutes.get("/tailors/:tailorId/services", asyncHandler(tailorsController.getTailorServices));
tailorsRoutes.post("/tailors/:tailorId/services", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema), asyncHandler(tailorsController.addTailorService));
tailorsRoutes.put("/tailors/services/:serviceId", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema.partial()), asyncHandler(tailorsController.updateTailorService));
tailorsRoutes.patch("/tailors/services/:serviceId", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema.partial()), asyncHandler(tailorsController.updateTailorService));
tailorsRoutes.delete("/tailors/services/:serviceId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteTailorService));
tailorsRoutes.put("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema.partial()), asyncHandler(tailorsController.updateTailorService));
tailorsRoutes.patch("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), validate(tailorServiceSchema.partial()), asyncHandler(tailorsController.updateTailorService));
tailorsRoutes.delete("/tailors/:tailorId/services/:serviceId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteTailorService));

/**
 * @swagger
 * /tailors/{tailorId}/availability/blocked-dates:
 *   get:
 *     summary: Get blocked calendar dates for a tailor
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Blocked dates list
 *   put:
 *     summary: Replace blocked calendar dates for a tailor
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               blockedDates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: "2026-12-25"
 *     responses:
 *       200:
 *         description: Blocked dates updated
 */
tailorsRoutes.get("/tailors/:tailorId/availability/blocked-dates", asyncHandler(tailorsController.getBlockedDates));
tailorsRoutes.put("/tailors/:tailorId/availability/blocked-dates", requireAuth, requireRole("tailor", "admin"), validate(blockedDatesSchema), asyncHandler(tailorsController.setBlockedDates));

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
tailorsRoutes.put("/tailors/:tailorId/availability", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySchema), asyncHandler(tailorsController.setTailorAvailability));
tailorsRoutes.post("/tailors/:tailorId/availability", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySchema), asyncHandler(tailorsController.setTailorAvailability));

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
tailorsRoutes.patch("/availability/:slotId", requireAuth, requireRole("tailor", "admin"), validate(tailorAvailabilitySlotSchema.partial()), asyncHandler(tailorsController.updateAvailabilitySlot));
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
 * /tailors/{tailorId}/banner:
 *   post:
 *     summary: Upload or update shop banner for tailor profile
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               banner:
 *                 type: string
 *                 format: binary
 *                 description: Shop banner image file (JPEG, PNG, WebP)
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bannerUrl: { type: string, format: uri }
 *     responses:
 *       200:
 *         description: Shop banner updated successfully
 */
tailorsRoutes.post("/tailors/:tailorId/banner", requireAuth, requireRole("tailor", "admin"), uploadSingleImage("banner"), validate(uploadTailorBannerSchema), asyncHandler(tailorsController.uploadTailorBanner));

/**
 * @swagger
 * /tailors/{tailorId}/gallery:
 *   get:
 *     summary: Get tailor portfolio gallery images
 *     tags: [Tailors]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tailor gallery images
 *   post:
 *     summary: Add an image to tailor portfolio gallery
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *               caption: { type: string }
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageUrl: { type: string, format: uri }
 *               caption: { type: string }
 *     responses:
 *       201:
 *         description: Gallery image added
 *   delete:
 *     summary: Delete an image from tailor portfolio gallery by imageId or imageUrl
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: imageId
 *         schema: { type: string }
 *       - in: query
 *         name: imageUrl
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageId: { type: string }
 *               imageUrl: { type: string }
 *     responses:
 *       200:
 *         description: Gallery image deleted
 * /tailors/{tailorId}/gallery/{imageId}:
 *   delete:
 *     summary: Delete a specific gallery image by ID
 *     tags: [Tailors]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Gallery image deleted
 */
tailorsRoutes.get("/tailors/:tailorId/gallery", asyncHandler(tailorsController.getGallery));
tailorsRoutes.post("/tailors/:tailorId/gallery", requireAuth, requireRole("tailor", "admin"), uploadSingleImage("image"), validate(addGalleryImageSchema), asyncHandler(tailorsController.addGalleryImage));
tailorsRoutes.delete("/tailors/:tailorId/gallery", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteGalleryImage));
tailorsRoutes.delete("/tailors/:tailorId/gallery/:imageId", requireAuth, requireRole("tailor", "admin"), asyncHandler(tailorsController.deleteGalleryImage));


