import { z } from "zod";

const optionalMeasurementNumber = z.preprocess(
  (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
  z.number().positive().optional()
);

export const createMeasurementSchema = z
  .object({
    title: z.string().optional(),
    profileName: z.string().optional(),
    unit: z.enum(["in", "cm", "inches"]).default("in"),
    chest: optionalMeasurementNumber,
    waist: optionalMeasurementNumber,
    hips: optionalMeasurementNumber,
    shoulder: optionalMeasurementNumber,
    sleeveLength: optionalMeasurementNumber,
    shirtLength: optionalMeasurementNumber,
    trouserLength: optionalMeasurementNumber,
    inseam: optionalMeasurementNumber,
    neck: optionalMeasurementNumber,
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
    chest: optionalMeasurementNumber,
    waist: optionalMeasurementNumber,
    hips: optionalMeasurementNumber,
    shoulder: optionalMeasurementNumber,
    sleeveLength: optionalMeasurementNumber,
    shirtLength: optionalMeasurementNumber,
    trouserLength: optionalMeasurementNumber,
    inseam: optionalMeasurementNumber,
    neck: optionalMeasurementNumber,
    notes: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    ...(data.profileName && !data.title ? { title: data.profileName } : {}),
    ...(data.unit === "inches" ? { unit: "in" as const } : {}),
  }));

