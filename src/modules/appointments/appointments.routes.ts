import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as appointmentsController from "./appointments.controller.js";
import {
  createAppointmentSchema,
  updateAppointmentStatusSchema,
  rescheduleAppointmentSchema,
} from "./appointments.validator.js";

export const appointmentsRoutes = Router();

const appointmentAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Get appointments for the authenticated user (customer or tailor)
 *     tags: [Appointments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of appointments
 *   post:
 *     summary: Book a new tailor appointment
 *     tags: [Appointments]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tailorId, date, time]
 *             properties:
 *               tailorId: { type: string, format: uuid }
 *               serviceId: { type: string, format: uuid }
 *               date: { type: string, example: "2026-09-15" }
 *               time: { type: string, example: "14:00" }
 *               notes: { type: string }
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 */
appointmentsRoutes.get("/appointments", ...appointmentAuth, asyncHandler(appointmentsController.getAppointments));
appointmentsRoutes.post("/appointments", requireAuth, requireRole("customer", "admin"), validate(createAppointmentSchema), asyncHandler(appointmentsController.createAppointment));

/**
 * @swagger
 * /appointments/{appointmentId}:
 *   get:
 *     summary: Get appointment details by ID
 *     tags: [Appointments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Appointment details
 *   delete:
 *     summary: Cancel or delete an appointment
 *     tags: [Appointments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Appointment deleted
 */
appointmentsRoutes.get("/appointments/:appointmentId", ...appointmentAuth, asyncHandler(appointmentsController.getAppointmentById));
appointmentsRoutes.delete("/appointments/:appointmentId", ...appointmentAuth, asyncHandler(appointmentsController.deleteAppointment));

/**
 * @swagger
 * /appointments/{appointmentId}/status:
 *   patch:
 *     summary: Update appointment status (pending, confirmed, completed, cancelled)
 *     tags: [Appointments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending, confirmed, cancelled, completed] }
 *     responses:
 *       200:
 *         description: Appointment status updated
 */
appointmentsRoutes.patch("/appointments/:appointmentId/status", ...appointmentAuth, validate(updateAppointmentStatusSchema), asyncHandler(appointmentsController.updateAppointmentStatus));

/**
 * @swagger
 * /appointments/{appointmentId}/reschedule:
 *   patch:
 *     summary: Reschedule appointment to a new date and time
 *     tags: [Appointments]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: appointmentId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, time]
 *             properties:
 *               date: { type: string, example: "2026-09-20" }
 *               time: { type: string, example: "16:00" }
 *     responses:
 *       200:
 *         description: Appointment rescheduled
 */
appointmentsRoutes.patch("/appointments/:appointmentId/reschedule", ...appointmentAuth, validate(rescheduleAppointmentSchema), asyncHandler(appointmentsController.rescheduleAppointment));

