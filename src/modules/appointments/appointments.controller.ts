import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { appointmentsService } from "./appointments.service.js";

export const getAppointments: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await appointmentsService.getAppointments(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Appointments fetched successfully");
};

export const createAppointment: RequestHandler = async (req, res) => {
  const created = await appointmentsService.createAppointment(req.user?.id, req.userRole, req.body);
  success(res, created, "Appointment created successfully", 201);
};

export const getAppointmentById: RequestHandler = async (req, res) => {
  const appointment = await appointmentsService.getAppointmentById(asString(req.params.appointmentId), req.user?.id, req.userRole);
  success(res, appointment, "Appointment fetched successfully");
};

export const updateAppointmentStatus: RequestHandler = async (req, res) => {
  const updated = await appointmentsService.updateAppointmentStatus(
    asString(req.params.appointmentId),
    req.user?.id,
    req.userRole,
    req.body.status,
  );
  success(res, updated, "Appointment status updated successfully");
};

export const rescheduleAppointment: RequestHandler = async (req, res) => {
  const rescheduled = await appointmentsService.rescheduleAppointment(
    asString(req.params.appointmentId),
    req.user?.id,
    req.userRole,
    req.body,
  );
  success(res, rescheduled, "Appointment rescheduled successfully");
};

export const deleteAppointment: RequestHandler = async (req, res) => {
  await appointmentsService.deleteAppointment(asString(req.params.appointmentId), req.user?.id, req.userRole);
  success(res, null, "Appointment deleted successfully");
};
