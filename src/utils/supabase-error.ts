import { AppError } from "./app-error.js";

/**
 * Checks whether a Supabase/PostgREST error indicates a table does not exist yet
 * (PostgreSQL 42P01 or PostgREST PGRST205 schema cache miss).
 */
export const isMissingTableError = (error: { code?: string; message?: string } | null | undefined): boolean => {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const msg = (error.message || "").toLowerCase();
  return (msg.includes("relation") && msg.includes("does not exist")) || msg.includes("could not find the table");
};

/**
 * Checks whether a Supabase/PostgREST error indicates a column does not exist yet
 * (PostgreSQL 42703 or PostgREST PGRST204 schema cache miss).
 */
export const isMissingColumnError = (error: { code?: string; message?: string } | null | undefined): boolean => {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  const msg = (error.message || "").toLowerCase();
  return msg.includes("column") && (msg.includes("does not exist") || msg.includes("could not find"));
};

/**
 * Throws a user-friendly AppError for database errors, highlighting unapplied migration 014 if a new table is missing.
 */
export const throwDbError = (error: { code?: string; message?: string }, tableName?: string): never => {
  if (isMissingTableError(error)) {
    const label = tableName ? `Table '${tableName}'` : "Required database table";
    throw new AppError(
      `${label} is not initialized yet. Please apply migration 014_fulfill_backend_gaps.sql.`,
      503,
    );
  }
  throw new AppError(error.message || "Database operation failed", 400);
};
