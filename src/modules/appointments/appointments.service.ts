import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const appointmentsService = {
  async getAppointments(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    let query = client
      .from("appointments")
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*), service:tailor_services!service_id(*)", { count: "exact" });

    if (userId && userRole !== "admin") {
      if (userRole === "tailor") {
        query = query.eq("tailor.user_id", userId);
      } else {
        query = query.eq("customer_id", userId);
      }
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range((p - 1) * l, p * l - 1);

    if (error) throw new AppError(error.message, 400);

    return {
      records: data ?? [],
      page: p,
      limit: l,
      total: count ?? 0,
      singleRecord: null,
    };
  },

  async getAppointmentById(appointmentId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("appointments")
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*), service:tailor_services!service_id(*)")
      .eq("id", appointmentId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async createAppointment(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("appointments")
      .insert({
        ...mapped,
        customer_id: userId,
      })
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateAppointmentStatus(appointmentId: string, _userId: string | undefined, _userRole: string | undefined, status: string) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("appointments")
      .update({ status })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async rescheduleAppointment(appointmentId: string, _userId: string | undefined, _userRole: string | undefined, date: string) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("appointments")
      .update({ appointment_date: date, status: "rescheduled" })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteAppointment(appointmentId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "appointments",
      id: appointmentId,
      userId,
      userIdColumn: "customer_id",
      userRole,
    });
  },
};

