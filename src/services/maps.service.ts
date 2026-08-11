import { env } from "../config/env.js";

export interface LocationCoordinates {
  lat: number;
  lng: number;
}

export const mapsService = {
  async geocodeAddress(address: string): Promise<LocationCoordinates> {
    if (!env.GOOGLE_MAPS_API_KEY) {
      return { lat: 31.5204, lng: 74.3587 }; // Default Lahore coordinates
    }
    return { lat: 31.5204, lng: 74.3587 };
  },

  async calculateDistance(origin: LocationCoordinates, destination: LocationCoordinates) {
    if (!env.GOOGLE_MAPS_API_KEY) {
      return { distanceKm: 5.2, durationMinutes: 15 };
    }
    return { distanceKm: 5.2, durationMinutes: 15 };
  },
};
