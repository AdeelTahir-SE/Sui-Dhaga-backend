export interface CreateTailorPayload {
  shopName: string;
  specialties: string[];
  city: string;
  address?: string;
  experienceYears?: number;
  bio?: string;
}

export interface UpdateTailorPayload {
  shopName?: string;
  specialties?: string[];
  city?: string;
  address?: string;
  experienceYears?: number;
  bio?: string;
  removeImageId?: string;
  verified?: boolean;
}

export interface TailorServicePayload {
  title: string;
  price: number;
  description?: string;
  category?: string;
}

export interface TailorAvailabilityPayload {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface TailorsComparePayload {
  tailorIds: string[];
}
