import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as measurementsController from "./measurements.controller.js";
import { createMeasurementSchema, updateMeasurementSchema } from "./measurements.validator.js";

export const measurementsRoutes = Router();

const measurementAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

/**
 * @openapi
 * /measurements:
 *   get:
 *     summary: List user measurements
 *     tags: [Measurements]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of measurements retrieved successfully
 *   post:
 *     summary: Create new measurement profile
 *     tags: [Measurements]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title:
 *                 type: string
 *               unit:
 *                 type: string
 *                 enum: [in, cm]
 *                 default: in
 *               chest:
 *                 type: number
 *               waist:
 *                 type: number
 *               hips:
 *                 type: number
 *               shoulder:
 *                 type: number
 *               sleeveLength:
 *                 type: number
 *               inseam:
 *                 type: number
 *               neck:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Measurement profile created successfully
 */
measurementsRoutes.get("/measurements", ...measurementAuth, asyncHandler(measurementsController.getMeasurements));
measurementsRoutes.post("/measurements", requireAuth, requireRole("customer", "admin"), validate(createMeasurementSchema), asyncHandler(measurementsController.createMeasurement));

/**
 * @openapi
 * /measurements/{measurementId}:
 *   get:
 *     summary: Get measurement profile by ID
 *     tags: [Measurements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: measurementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Measurement profile retrieved successfully
 *       404:
 *         description: Measurement not found
 *   patch:
 *     summary: Update measurement profile
 *     tags: [Measurements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: measurementId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               unit:
 *                 type: string
 *                 enum: [in, cm]
 *               chest:
 *                 type: number
 *               waist:
 *                 type: number
 *               hips:
 *                 type: number
 *               shoulder:
 *                 type: number
 *               sleeveLength:
 *                 type: number
 *               inseam:
 *                 type: number
 *               neck:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Measurement profile updated successfully
 *   delete:
 *     summary: Delete measurement profile
 *     tags: [Measurements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: measurementId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Measurement profile deleted successfully
 */
measurementsRoutes.get("/measurements/:measurementId", ...measurementAuth, asyncHandler(measurementsController.getMeasurementById));
measurementsRoutes.patch("/measurements/:measurementId", ...measurementAuth, validate(updateMeasurementSchema), asyncHandler(measurementsController.updateMeasurement));
measurementsRoutes.delete("/measurements/:measurementId", ...measurementAuth, asyncHandler(measurementsController.deleteMeasurement));
