export interface CreateMeasurementPayload {
  title?: string;
  profileName?: string;
  unit?: "in" | "cm" | "inches";
  chest?: number;
  waist?: number;
  hips?: number;
  shoulder?: number;
  sleeveLength?: number;
  shirtLength?: number;
  trouserLength?: number;
  inseam?: number;
  neck?: number;
  notes?: string;
}

export interface UpdateMeasurementPayload extends Partial<CreateMeasurementPayload> {}
