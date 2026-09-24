import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

const isUuid = (val: unknown): boolean =>
  typeof val === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

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
        try {
          const { data: tRec } = await client
            .from("tailors")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (tRec?.id) {
            query = query.eq("tailor_id", tRec.id);
          } else {
            query = query.or(`tailor_id.eq.${userId},customer_id.eq.${userId}`);
          }
        } catch {
          query = query.eq("customer_id", userId);
        }
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

    const rawTailorId = (data.tailorId ?? data.tailor_id) as string | undefined;

    let tailorId: string | null = null;
    if (rawTailorId && typeof rawTailorId === "string" && rawTailorId.trim()) {
      const cleanId = rawTailorId.trim();
      if (isUuid(cleanId)) {
        try {
          const { data: tailorRec } = await client
            .from("tailors")
            .select("id")
            .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
            .maybeSingle();
          if (tailorRec?.id) {
            tailorId = tailorRec.id;
          }
        } catch {}
      } else {
        try {
          const { data: tailorRec } = await client
            .from("tailors")
            .select("id")
            .ilike("shop_name", `%${cleanId}%`)
            .maybeSingle();
          if (tailorRec?.id) {
            tailorId = tailorRec.id;
          }
        } catch {}
      }
    }

    // Fallback to first available tailor in DB if tailorId could not be resolved
    if (!tailorId) {
      try {
        const { data: firstTailor } = await client
          .from("tailors")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (firstTailor?.id) {
          tailorId = firstTailor.id;
        }
      } catch {}
    }

    if (!tailorId) {
      throw new AppError("No available tailor found for appointment booking", 400);
    }

    let serviceId: string | null = null;
    const rawServiceId = (data.serviceId ?? data.service_id) as string | undefined;
    if (rawServiceId && typeof rawServiceId === "string" && isUuid(rawServiceId.trim())) {
      try {
        const { data: sRec } = await client
          .from("tailor_services")
          .select("id")
          .eq("id", rawServiceId.trim())
          .maybeSingle();
        if (sRec?.id) {
          serviceId = sRec.id;
        }
      } catch {}
    }

    const appointmentDate = (data.appointment_date ?? data.appointmentDate ?? data.date) as string | undefined;
    const appointmentTime = (data.appointment_time ?? data.appointmentTime ?? data.time) as string | undefined;
    const notes = (data.notes as string | undefined) ?? null;

    const insertPayload: Record<string, unknown> = {
      customer_id: userId,
      tailor_id: tailorId,
      appointment_date: appointmentDate || new Date().toISOString().split("T")[0],
      appointment_time: appointmentTime || "10:00",
      notes: notes || null,
      status: "pending",
    };

    if (serviceId) {
      insertPayload.service_id = serviceId;
    }

    const { data: created, error } = await client
      .from("appointments")
      .insert(insertPayload)
      .select("*, customer:profiles!customer_id(*), tailor:tailors!tailor_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateAppointmentStatus(appointmentId: string, _userId: string | undefined, _userRole: string | undefined, status: string) {
    const client = getDbClient();
    const normalizedStatus = (status || "").toLowerCase();
    const { data: updated, error } = await client
      .from("appointments")
      .update({ status: normalizedStatus })
      .eq("id", appointmentId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async rescheduleAppointment(appointmentId: string, _userId: string | undefined, _userRole: string | undefined, data: any) {
    const client = getDbClient();
    const newDate = typeof data === "string" ? data : (data?.appointment_date || data?.date || data?.appointmentDate);
    const newTime = typeof data === "object" ? (data?.appointment_time || data?.time || data?.appointmentTime) : undefined;

    const updatePayload: Record<string, unknown> = { status: "rescheduled" };
    if (newDate) updatePayload.appointment_date = newDate;
    if (newTime) updatePayload.appointment_time = newTime;

    const { data: updated, error } = await client
      .from("appointments")
      .update(updatePayload)
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
