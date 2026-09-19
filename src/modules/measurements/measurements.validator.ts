import { z } from "zod";

export const createMeasurementSchema = z
  .object({
    title: z.string().optional(),
    profileName: z.string().optional(),
    unit: z.enum(["in", "cm", "inches"]).default("in"),
    chest: z.number().positive().optional(),
    waist: z.number().positive().optional(),
    hips: z.number().positive().optional(),
    shoulder: z.number().positive().optional(),
    sleeveLength: z.number().positive().optional(),
    shirtLength: z.number().positive().optional(),
    trouserLength: z.number().positive().optional(),
    inseam: z.number().positive().optional(),
    neck: z.number().positive().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Boolean(data.title || data.profileName), {
    message: "Title or profileName is required",
    path: ["title"],
  })
  .transform((data) => ({
    ...data,
    title: data.title || data.profileName || "My Measurements",
    unit: data.unit === "inches" ? "in" : data.unit,
  }));

export const updateMeasurementSchema = z
  .object({
    title: z.string().optional(),
    profileName: z.string().optional(),
    unit: z.enum(["in", "cm", "inches"]).optional(),
    chest: z.number().positive().optional(),
    waist: z.number().positive().optional(),
    hips: z.number().positive().optional(),
    shoulder: z.number().positive().optional(),
    sleeveLength: z.number().positive().optional(),
    shirtLength: z.number().positive().optional(),
    trouserLength: z.number().positive().optional(),
    inseam: z.number().positive().optional(),
    neck: z.number().positive().optional(),
    notes: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    ...(data.profileName && !data.title ? { title: data.profileName } : {}),
    ...(data.unit === "inches" ? { unit: "in" as const } : {}),
  }));

