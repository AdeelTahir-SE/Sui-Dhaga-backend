import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const appointmentsService = {
  async getAppointments(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "appointments",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async getAppointmentById(appointmentId: string, userId: string | undefined, userRole: string | undefined) {
    const { singleRecord } = await fetchResources({
      resourceType: "appointments",
      id: appointmentId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async createAppointment(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "appointments",
      userId,
      userRole,
      data,
    });
  },

  async updateAppointmentStatus(appointmentId: string, userId: string | undefined, userRole: string | undefined, status: string) {
    return saveResource({
      resourceType: "appointments",
      id: appointmentId,
      userId,
      userRole,
      data: { status },
    });
  },

  async rescheduleAppointment(appointmentId: string, userId: string | undefined, userRole: string | undefined, date: string) {
    return saveResource({
      resourceType: "appointments",
      id: appointmentId,
      userId,
      userRole,
      data: { date, status: "rescheduled" },
    });
  },

  async deleteAppointment(appointmentId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "appointments",
      id: appointmentId,
      userId,
      userRole,
    });
  },
};
