import type { Response } from "express";

export const success = <T>(res: Response, data: T, message = "Request successful", status = 200) =>
  res.status(status).json({ success: true, message, data });

export const paginated = <T>(res: Response, data: T[], page: number, limit: number, total: number, message = "Request successful") =>
  res.status(200).json({ success: true, message, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
