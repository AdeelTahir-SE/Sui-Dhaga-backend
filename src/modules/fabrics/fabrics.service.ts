import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const fabricsService = {
  async getFabrics(page = 1, limit = 20) {
    return fetchTableData({
      table: "fabrics",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getFabricById(fabricId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("fabrics")
      .select("*")
      .eq("id", fabricId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async createFabric(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("fabrics")
      .insert({
        ...mapped,
        ...(userId ? { user_id: userId } : {}),
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateFabric(fabricId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("fabrics")
      .update(mapped)
      .eq("id", fabricId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteFabric(fabricId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "fabrics",
      id: fabricId,
      userId,
      userRole,
    });
  },
};

