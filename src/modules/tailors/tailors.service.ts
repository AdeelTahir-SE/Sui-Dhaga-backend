import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const tailorsService = {
  async getTailors(page = 1, limit = 20) {
    return fetchTableData({
      table: "tailors",
      select: "*, profile:profiles(*)",
      page,
      limit,
      orderColumn: "rating",
      ascending: false,
    });
  },

  async getTailorById(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .select("*, profile:profiles(*), services:tailor_services(*), availability:tailor_availability(*), gallery:tailor_gallery(*), reviews(*)")
      .eq("id", tailorId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async createTailor(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("tailors")
      .insert({ ...mapped, user_id: userId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateTailor(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    let query = client.from("tailors").update(mapped).eq("id", tailorId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteTailor(tailorId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "tailors",
      id: tailorId,
      userId,
      userRole,
    });
  },

  async getTailorServices(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailor_services")
      .select("*")
      .eq("tailor_id", tailorId)
      .eq("is_active", true);

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addTailorService(tailorId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("tailor_services")
      .insert({ ...mapped, tailor_id: tailorId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateTailorService(serviceId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("tailor_services")
      .update(mapped)
      .eq("id", serviceId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteTailorService(serviceId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { error } = await client.from("tailor_services").delete().eq("id", serviceId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async getTailorAvailability(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailor_availability")
      .select("*")
      .eq("tailor_id", tailorId);

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addTailorAvailability(tailorId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("tailor_availability")
      .insert({ ...mapped, tailor_id: tailorId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateAvailabilitySlot(slotId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("tailor_availability")
      .update(mapped)
      .eq("id", slotId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteAvailabilitySlot(slotId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { error } = await client.from("tailor_availability").delete().eq("id", slotId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },
};

