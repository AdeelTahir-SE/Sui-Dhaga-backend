import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const measurementsService = {
  async getMeasurements(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    const result = await fetchTableData({
      table: "measurements",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });

    const records = (result.records || []).map((r: any) => ({
      ...r,
      profileName: r.title || r.profile_name || r.profileName,
      sleeveLength: r.sleeve_length ?? r.sleeveLength,
      shirtLength: r.shirt_length ?? r.shirtLength,
      trouserLength: r.trouser_length ?? r.trouserLength,
    }));

    return { ...result, records };
  },

  async getMeasurementById(measurementId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("measurements")
      .select("*")
      .eq("id", measurementId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (!data) return null;
    return {
      ...data,
      profileName: data.title || data.profile_name || data.profileName,
      sleeveLength: data.sleeve_length ?? data.sleeveLength,
      shirtLength: data.shirt_length ?? data.shirtLength,
      trouserLength: data.trouser_length ?? data.trouserLength,
    };
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
    return {
      ...created,
      profileName: created?.title || data.profileName,
      shirtLength: data.shirtLength,
      trouserLength: data.trouserLength,
    };
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
    return {
      ...updated,
      profileName: updated?.title || data.profileName,
      shirtLength: data.shirtLength,
      trouserLength: data.trouserLength,
    };
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

