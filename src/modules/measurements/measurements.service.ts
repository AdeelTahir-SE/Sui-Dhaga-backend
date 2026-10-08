import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

function formatMeasurement(m: any) {
  if (!m) return m;
  return {
    id: m.id,
    userId: m.user_id ?? m.userId,
    profileName: m.title || m.profileName || m.profile_name || "My Measurements",
    gender: m.gender,
    unit: m.unit || "in",
    chest: m.chest != null ? Number(m.chest) : undefined,
    waist: m.waist != null ? Number(m.waist) : undefined,
    hips: m.hips != null ? Number(m.hips) : undefined,
    shoulder: m.shoulder != null ? Number(m.shoulder) : undefined,
    sleeveLength: (m.sleeveLength ?? m.sleeve_length) != null ? Number(m.sleeveLength ?? m.sleeve_length) : undefined,
    shirtLength: (m.shirtLength ?? m.shirt_length) != null ? Number(m.shirtLength ?? m.shirt_length) : undefined,
    trouserLength: (m.trouserLength ?? m.trouser_length) != null ? Number(m.trouserLength ?? m.trouser_length) : undefined,
    inseam: m.inseam != null ? Number(m.inseam) : undefined,
    neck: m.neck != null ? Number(m.neck) : undefined,
    notes: m.notes || undefined,
    createdAt: m.created_at || m.createdAt,
    updatedAt: m.updated_at || m.updatedAt,
  };
}

export const measurementsService = {
  async getMeasurements(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    const result = await fetchTableData({
      table: "measurements",
      select: "id, user_id, title, gender, unit, chest, waist, hips, shoulder, sleeve_length, shirt_length, trouser_length, inseam, neck, notes, created_at, updated_at",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });

    const records = (result.records || []).map(formatMeasurement);
    return { ...result, records };
  },

  async getMeasurementById(measurementId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("measurements")
      .select("id, user_id, title, gender, unit, chest, waist, hips, shoulder, sleeve_length, shirt_length, trouser_length, inseam, neck, notes, created_at, updated_at")
      .eq("id", measurementId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (!data) return null;
    return formatMeasurement(data);
  },

  async createMeasurement(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    
    // Ensure title and unit are normalized
    mapped.title = data.title || data.profileName || data.profile_name || "My Measurements";
    if (mapped.unit === "inches") mapped.unit = "in";
    delete mapped.profile_name;

    // First try full insert with all fields
    let { data: created, error } = await client
      .from("measurements")
      .insert({
        ...mapped,
        user_id: userId,
      })
      .select()
      .single();

    // If shirt_length or trouser_length column is missing in DB schema, fallback gracefully
    if (error && (error.message?.includes("shirt_length") || error.message?.includes("trouser_length"))) {
      const fallbackMapped = { ...mapped };
      delete fallbackMapped.shirt_length;
      delete fallbackMapped.trouser_length;
      const retry = await client
        .from("measurements")
        .insert({
          ...fallbackMapped,
          user_id: userId,
        })
        .select()
        .single();
      created = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);
    return formatMeasurement({
      ...created,
      shirt_length: data.shirtLength ?? created?.shirt_length,
      trouser_length: data.trouserLength ?? created?.trouser_length,
    });
  },

  async updateMeasurement(measurementId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    if (data.profileName || data.profile_name) {
      mapped.title = data.title || data.profileName || data.profile_name;
      delete mapped.profile_name;
    }
    if (mapped.unit === "inches") mapped.unit = "in";

    let query = client.from("measurements").update(mapped).eq("id", measurementId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    let { data: updated, error } = await query.select().single();

    if (error && (error.message?.includes("shirt_length") || error.message?.includes("trouser_length"))) {
      const fallbackMapped = { ...mapped };
      delete fallbackMapped.shirt_length;
      delete fallbackMapped.trouser_length;
      let fallbackQuery = client.from("measurements").update(fallbackMapped).eq("id", measurementId);
      if (userId && userRole !== "admin") {
        fallbackQuery = fallbackQuery.eq("user_id", userId);
      }
      const retry = await fallbackQuery.select().single();
      updated = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);
    return formatMeasurement({
      ...updated,
      shirt_length: data.shirtLength ?? updated?.shirt_length,
      trouser_length: data.trouserLength ?? updated?.trouser_length,
    });
  },

  async deleteMeasurement(measurementId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "measurements",
      id: measurementId,
      userId,
      userRole,
    });
  },
};

