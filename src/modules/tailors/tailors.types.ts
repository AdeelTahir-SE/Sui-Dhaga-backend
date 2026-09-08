export interface CreateTailorPayload {
  shopName: string;
  specialties: string[];
  city: string;
  address?: string;
  experienceYears?: number;
  bio?: string;
  bannerUrl?: string;
}

export interface UpdateTailorPayload {
  shopName?: string;
  specialties?: string[];
  city?: string;
  address?: string;
  experienceYears?: number;
  bio?: string;
  bannerUrl?: string;
  removeImageId?: string;
  verified?: boolean;
}

export interface UploadTailorBannerPayload {
  bannerUrl?: string;
  banner?: string;
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
