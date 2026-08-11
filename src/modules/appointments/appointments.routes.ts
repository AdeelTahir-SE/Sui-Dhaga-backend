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

appointmentsRoutes.get("/appointments", ...appointmentAuth, asyncHandler(appointmentsController.getAppointments));
appointmentsRoutes.post("/appointments", requireAuth, requireRole("customer", "admin"), validate(createAppointmentSchema), asyncHandler(appointmentsController.createAppointment));
appointmentsRoutes.get("/appointments/:appointmentId", ...appointmentAuth, asyncHandler(appointmentsController.getAppointmentById));
appointmentsRoutes.patch("/appointments/:appointmentId/status", ...appointmentAuth, validate(updateAppointmentStatusSchema), asyncHandler(appointmentsController.updateAppointmentStatus));
appointmentsRoutes.patch("/appointments/:appointmentId/reschedule", ...appointmentAuth, validate(rescheduleAppointmentSchema), asyncHandler(appointmentsController.rescheduleAppointment));
appointmentsRoutes.delete("/appointments/:appointmentId", ...appointmentAuth, asyncHandler(appointmentsController.deleteAppointment));
