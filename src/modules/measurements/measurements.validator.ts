import { z } from "zod";

export const createMeasurementSchema = z.object({
  title: z.string().min(1),
  unit: z.enum(["in", "cm"]).default("in"),
  chest: z.number().positive().optional(),
  waist: z.number().positive().optional(),
  hips: z.number().positive().optional(),
  shoulder: z.number().positive().optional(),
  sleeveLength: z.number().positive().optional(),
  inseam: z.number().positive().optional(),
  neck: z.number().positive().optional(),
  notes: z.string().optional(),
});

export const updateMeasurementSchema = createMeasurementSchema.partial();
