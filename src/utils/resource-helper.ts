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

export const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
    result[snakeKey] = value;
  }
  return result;
};

export interface FetchTableOptions {
  table: string;
  select?: string;
  id?: string;
  userId?: string;
  userIdColumn?: string;
  userRole?: string;
  page?: number;
  limit?: number;
  orderColumn?: string;
  ascending?: boolean;
  filters?: Record<string, unknown>;
}

export const fetchTableData = async <T = Record<string, unknown>>(options: FetchTableOptions): Promise<{
  records: T[];
  page: number;
  limit: number;
  total: number;
  singleRecord: T | null;
}> => {
  const client = getDbClient();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const selectQuery = options.select || "*";

  let query = (client
    .from(options.table)
    .select(selectQuery, { count: "exact" }) as any);

  if (options.id) {
    query = query.eq("id", options.id);
  }

  if (options.userId && options.userRole !== "admin") {
    const userCol = options.userIdColumn || "user_id";
    query = query.eq(userCol, options.userId);
  }

  if (options.filters) {
    for (const [key, val] of Object.entries(options.filters)) {
      if (val !== undefined && val !== null) {
        query = query.eq(key, val);
      }
    }
  }

  if (options.orderColumn) {
    query = query.order(options.orderColumn, { ascending: options.ascending ?? false });
  }

  const { data, error, count } = await query.range(
    (page - 1) * limit,
    page * limit - 1,
  );

  if (error) {
    throw new AppError(error.message, 400);
  }

  const records = (data ?? []) as T[];

  return {
    records,
    page,
    limit,
    total: count ?? 0,
    singleRecord: options.id ? (records[0] ?? null) : null,
  };
};


export interface SaveTableOptions {
  table: string;
  id?: string;
  userId?: string;
  userIdColumn?: string;
  userRole?: string;
  data: Record<string, unknown>;
}

export const saveTableData = async (options: SaveTableOptions) => {
  const client = getDbClient();
  const userCol = options.userIdColumn || "user_id";
  const mappedData = toSnakeCase(options.data);

  if (options.id) {
    let updateQuery = client
      .from(options.table)
      .update(mappedData)
      .eq("id", options.id);

    if (options.userId && options.userRole !== "admin") {
      updateQuery = updateQuery.eq(userCol, options.userId);
    }

    const { data, error } = await updateQuery.select().single();
    if (error) throw new AppError(error.message, 400);
    return data;
  } else {
    const insertPayload = {
      ...mappedData,
      ...(options.userId ? { [userCol]: options.userId } : {}),
    };

    const { data, error } = await client
      .from(options.table)
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return data;
  }
};

export interface DeleteTableOptions {
  table: string;
  id: string;
  userId?: string;
  userIdColumn?: string;
  userRole?: string;
}

export const deleteTableData = async (options: DeleteTableOptions) => {
  const client = getDbClient();
  if (!options.id) {
    throw new AppError("ID is required for deletion", 400);
  }

  const userCol = options.userIdColumn || "user_id";
  let query = client.from(options.table).delete().eq("id", options.id);

  if (options.userId && options.userRole !== "admin") {
    query = query.eq(userCol, options.userId);
  }

  const { error } = await query;
  if (error) throw new AppError(error.message, 400);
  return true;
};

