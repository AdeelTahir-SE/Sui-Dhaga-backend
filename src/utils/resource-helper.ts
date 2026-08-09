import { supabase } from "../config/supabase.js";
import { AppError } from "./app-error.js";

export const getDbClient = () => {
  if (!supabase) {
    throw new AppError("Database service is not configured", 503);
  }
  return supabase;
};

export const extractIdParam = (params: Record<string, string | string[]>): string | undefined => {
  for (const value of Object.values(params)) {
    const str = Array.isArray(value) ? value[0] : value;
    if (str && /^[0-9a-f-]{16,}$/i.test(str)) {
      return str;
    }
  }
  return undefined;
};

export const asString = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] ?? "";
  return param ?? "";
};

export interface FetchResourceOptions {
  resourceType: string;
  id?: string;
  userId?: string;
  userRole?: string;
  isPublic?: boolean;
  page?: number;
  limit?: number;
}

export const fetchResources = async (options: FetchResourceOptions) => {
  const client = getDbClient();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));

  let query = client
    .from("resources")
    .select("*", { count: "exact" })
    .eq("resource_type", options.resourceType);

  if (options.id) {
    query = query.eq("id", options.id);
  }

  if (!options.isPublic && options.userRole !== "admin" && options.userId) {
    query = query.eq("owner_id", options.userId);
  }

  const { data, error, count } = await query.range(
    (page - 1) * limit,
    page * limit - 1,
  );

  if (error) {
    throw new AppError(error.message, 400);
  }

  const records = (data ?? []).map((row: { id: string; data: Record<string, unknown> }) => ({
    id: row.id,
    ...row.data,
  }));

  return {
    records,
    page,
    limit,
    total: count ?? 0,
    singleRecord: options.id ? records[0] ?? null : null,
  };
};

export interface SaveResourceOptions {
  resourceType: string;
  id?: string;
  userId?: string;
  userRole?: string;
  data: Record<string, unknown>;
}

export const saveResource = async (options: SaveResourceOptions) => {
  const client = getDbClient();
  const payload = {
    ...options.data,
    ...(options.userId ? { user_id: options.userId } : {}),
  };

  if (options.id) {
    let updateQuery = client
      .from("resources")
      .update({ data: payload })
      .eq("id", options.id)
      .eq("resource_type", options.resourceType);

    if (options.userRole !== "admin" && options.userId) {
      updateQuery = updateQuery.eq("owner_id", options.userId);
    }

    const { data, error } = await updateQuery.select().single();
    if (error) throw new AppError(error.message, 400);
    return data ? { id: data.id, ...data.data } : null;
  } else {
    const { data, error } = await client
      .from("resources")
      .insert({
        resource_type: options.resourceType,
        owner_id: options.userId ?? null,
        data: payload,
      })
      .select()
      .single();
    if (error) throw new AppError(error.message, 400);
    return data ? { id: data.id, ...data.data } : null;
  }
};

export interface DeleteResourceOptions {
  resourceType: string;
  id?: string;
  userId?: string;
  userRole?: string;
}

export const deleteResource = async (options: DeleteResourceOptions) => {
  const client = getDbClient();
  if (!options.id) {
    throw new AppError("Resource ID is required for deletion", 400);
  }

  let query = client
    .from("resources")
    .delete()
    .eq("id", options.id)
    .eq("resource_type", options.resourceType);

  if (options.userRole !== "admin" && options.userId) {
    query = query.eq("owner_id", options.userId);
  }

  const { error } = await query;
  if (error) throw new AppError(error.message, 400);
  return true;
};
