export interface CreateMeasurementPayload {
  title: string;
  unit: "in" | "cm";
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeveLength?: number;
  inseam?: number;
  neck?: number;
  notes?: string;
}

export interface UpdateMeasurementPayload extends Partial<CreateMeasurementPayload> {}
