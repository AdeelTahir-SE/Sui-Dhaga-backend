import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { appointmentsService } from "./appointments.service.js";

export const appointmentsRoutes = Router();

const appointmentAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

appointmentsRoutes.get(
  "/appointments",
  ...appointmentAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await appointmentsService.getAppointments(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Appointments fetched successfully");
  }),
);

appointmentsRoutes.post(
  "/appointments",
  ...appointmentAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await appointmentsService.createAppointment(req.user?.id, req.userRole, req.body);
    success(res, created, "Appointment created successfully", 201);
  }),
);

appointmentsRoutes.get(
  "/appointments/:appointmentId",
  ...appointmentAuth,
  asyncHandler(async (req, res) => {
    const appointment = await appointmentsService.getAppointmentById(asString(req.params.appointmentId), req.user?.id, req.userRole);
    success(res, appointment, "Appointment fetched successfully");
  }),
);

appointmentsRoutes.patch(
  "/appointments/:appointmentId/status",
  ...appointmentAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await appointmentsService.updateAppointmentStatus(
      asString(req.params.appointmentId),
      req.user?.id,
      req.userRole,
      req.body.status as string,
    );
    success(res, updated, "Appointment status updated successfully");
  }),
);

appointmentsRoutes.patch(
  "/appointments/:appointmentId/reschedule",
  ...appointmentAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await appointmentsService.rescheduleAppointment(
      asString(req.params.appointmentId),
      req.user?.id,
      req.userRole,
      req.body.date as string,
    );
    success(res, updated, "Appointment rescheduled successfully");
  }),
);

appointmentsRoutes.delete(
  "/appointments/:appointmentId",
  ...appointmentAuth,
  asyncHandler(async (req, res) => {
    await appointmentsService.deleteAppointment(asString(req.params.appointmentId), req.user?.id, req.userRole);
    success(res, null, "Appointment canceled successfully");
  }),
);
