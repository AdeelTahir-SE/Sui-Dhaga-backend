import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { notificationsService } from "../notifications/notifications.service.js";


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
      .select("id, customer_id, tailor_id, service_id, appointment_date, appointment_time, notes, status, created_at, updated_at, customer:profiles!customer_id(id, full_name, avatar_url, phone), tailor:tailors!tailor_id(id, user_id, shop_name, rating, address, city, banner_url), service:tailor_services!service_id(id, title, price, duration, category)", { count: "exact" });

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
      .select("id, customer_id, tailor_id, service_id, appointment_date, appointment_time, notes, status, created_at, updated_at, customer:profiles!customer_id(id, full_name, avatar_url, phone), tailor:tailors!tailor_id(id, user_id, shop_name, rating, address, city, banner_url), service:tailor_services!service_id(id, title, price, duration, category)")
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
      .select("id, customer_id, tailor_id, service_id, appointment_date, appointment_time, notes, status, created_at, updated_at, customer:profiles!customer_id(id, full_name, avatar_url, phone), tailor:tailors!tailor_id(id, user_id, shop_name, rating, address, city, banner_url)")
      .single();

    if (error) throw new AppError(error.message, 400);

    // Notify parties about newly booked appointment
    try {
      const custObj: any = (created as any)?.customer;
      const tailorObj: any = (created as any)?.tailor;
      const customerName = (Array.isArray(custObj) ? custObj[0]?.full_name : custObj?.full_name) || "A customer";
      const tailorUserId = Array.isArray(tailorObj) ? tailorObj[0]?.user_id : tailorObj?.user_id;
      const tailorShop = (Array.isArray(tailorObj) ? tailorObj[0]?.shop_name : tailorObj?.shop_name) || "the tailor";
      const apptDate = created?.appointment_date || appointmentDate;
      const apptTime = created?.appointment_time || appointmentTime;

      // 1. Notify the tailor about incoming booking
      if (tailorUserId) {
        await notificationsService.createNotification({
          userId: tailorUserId,
          title: "New Appointment Booked 📅",
          message: `${customerName} booked an appointment for ${apptDate} at ${apptTime}.`,
          type: "appointment",
          data: {
            appointmentId: created.id,
            customerId: userId,
            date: apptDate,
            time: apptTime,
          },
        });
      }

      // 2. Notify customer with booking confirmation
      if (userId) {
        await notificationsService.createNotification({
          userId,
          title: "Appointment Booked 📅",
          message: `Your appointment with ${tailorShop} is scheduled for ${apptDate} at ${apptTime}.`,
          type: "appointment",
          data: {
            appointmentId: created.id,
            tailorId: created.tailor_id,
            date: apptDate,
            time: apptTime,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[Appointment Creation Notification Warning]:", notifErr?.message || notifErr);
    }

    return created;
  },

  async updateAppointmentStatus(appointmentId: string, _userId: string | undefined, _userRole: string | undefined, status: string) {
    const client = getDbClient();
    const normalizedStatus = (status || "").toLowerCase();
    const { data: updated, error } = await client
      .from("appointments")
      .update({ status: normalizedStatus })
      .eq("id", appointmentId)
      .select("id, customer_id, tailor_id, service_id, appointment_date, appointment_time, notes, status, created_at, updated_at, customer:profiles!customer_id(id, full_name, avatar_url, phone), tailor:tailors!tailor_id(id, user_id, shop_name, rating, address, city, banner_url)")
      .single();

    if (error) throw new AppError(error.message, 400);

    try {
      if (updated?.customer_id) {
        const tailorObj: any = (updated as any)?.tailor;
        const tailorShop = (Array.isArray(tailorObj) ? tailorObj[0]?.shop_name : tailorObj?.shop_name) || "Your tailor";
        const formattedStatus = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

        await notificationsService.createNotification({
          userId: updated.customer_id,
          title: `Appointment ${formattedStatus}`,
          message: `${tailorShop} marked your appointment on ${updated.appointment_date} as ${normalizedStatus}.`,
          type: "appointment",
          data: {
            appointmentId,
            status: normalizedStatus,
            date: updated.appointment_date,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[Appointment Status Notification Warning]:", notifErr?.message || notifErr);
    }

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
      .select("id, customer_id, tailor_id, service_id, appointment_date, appointment_time, notes, status, created_at, updated_at, customer:profiles!customer_id(id, full_name, avatar_url, phone), tailor:tailors!tailor_id(id, user_id, shop_name, rating, address, city, banner_url)")
      .single();

    if (error) throw new AppError(error.message, 400);

    try {
      if (updated?.customer_id) {
        const tailorObj: any = (updated as any)?.tailor;
        const tailorShop = (Array.isArray(tailorObj) ? tailorObj[0]?.shop_name : tailorObj?.shop_name) || "Your tailor";
        await notificationsService.createNotification({
          userId: updated.customer_id,
          title: "Appointment Rescheduled 📅",
          message: `${tailorShop} rescheduled your appointment to ${updated.appointment_date} at ${updated.appointment_time || ""}.`,
          type: "appointment",
          data: {
            appointmentId,
            status: "rescheduled",
            date: updated.appointment_date,
            time: updated.appointment_time,
          },
        });
      }
    } catch (notifErr: any) {
      console.warn("[Appointment Reschedule Notification Warning]:", notifErr?.message || notifErr);
    }

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
