export type UserRole = "customer" | "tailor" | "admin";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  q?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
