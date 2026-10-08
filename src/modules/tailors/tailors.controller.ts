import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { tailorsService } from "./tailors.service.js";

export const getTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await tailorsService.getTailors(page, limit);
  paginated(res, result.records, page, limit, result.total, "Tailors fetched successfully");
};

export const getNearbyTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const userLat = Number(req.query.lat);
  const userLng = Number(req.query.lng);
  const radius = Math.min(25, Math.max(1, Number(req.query.radius) || 25));
  const city = typeof req.query.city === "string" && req.query.city.toLowerCase() !== "all" ? req.query.city : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : typeof req.query.q === "string" ? req.query.q : undefined;
  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;

  if (!isNaN(userLat) && !isNaN(userLng)) {
    const result = await tailorsService.getNearbyTailors({
      lat: userLat,
      lng: userLng,
      radiusKm: radius,
      city,
      search,
      minRating,
      page,
      limit,
    });
    return paginated(res, result.records, page, limit, result.total, "Nearby tailors fetched successfully");
  }

  const result = await tailorsService.getTailors(page, limit);
  paginated(res, result.records, page, limit, result.total, "Tailors fetched successfully");
};

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  lahore: { lat: 31.5204, lng: 74.3587 },
  karachi: { lat: 24.8607, lng: 67.0011 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  faisalabad: { lat: 31.4504, lng: 73.1350 },
  multan: { lat: 30.1575, lng: 71.5249 },
  peshawar: { lat: 34.0151, lng: 71.5249 },
  quetta: { lat: 30.1798, lng: 66.9750 },
  sialkot: { lat: 32.4945, lng: 74.5229 },
  gujranwala: { lat: 32.1877, lng: 74.1945 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  mumbai: { lat: 19.0760, lng: 72.8777 },
};

function getDeterministicOffset(strId: string): { latOffset: number; lngOffset: number } {
  let hash = 0;
  for (let i = 0; i < strId.length; i++) {
    hash = (hash << 5) - hash + strId.charCodeAt(i);
    hash |= 0;
  }
  const normalized1 = ((Math.abs(hash) % 1000) / 1000) - 0.5;
  const normalized2 = ((Math.abs(hash >> 3) % 1000) / 1000) - 0.5;
  return {
    latOffset: normalized1 * 0.04,
    lngOffset: normalized2 * 0.04,
  };
}

export const getTailorsMap: RequestHandler = async (req, res) => {
  const cityQuery = typeof req.query.city === "string" ? req.query.city.trim().toLowerCase() : "";
  const searchQuery = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  let userLat = Number(req.query.lat);
  let userLng = Number(req.query.lng);
  const radius = Math.min(25, Math.max(1, Number(req.query.radius) || 25));

  if ((isNaN(userLat) || isNaN(userLng)) && cityQuery && cityQuery !== "all") {
    const baseCoords = CITY_COORDINATES[cityQuery] || CITY_COORDINATES["lahore"];
    if (baseCoords) {
      userLat = baseCoords.lat;
      userLng = baseCoords.lng;
    }
  }

  let records: Array<Record<string, unknown>> = [];

  if (!isNaN(userLat) && !isNaN(userLng)) {
    const result = await tailorsService.getNearbyTailors({
      lat: userLat,
      lng: userLng,
      radiusKm: radius,
      city: cityQuery && cityQuery !== "all" ? cityQuery : undefined,
      search: searchQuery || undefined,
      page: 1,
      limit: 100,
    });
    records = result.records as Array<Record<string, unknown>>;
  } else {
    const result = await tailorsService.getTailors(1, 100);
    records = result.records as Array<Record<string, unknown>>;
  }

  records = records.map((t) => {
    let lat = typeof t.latitude === "number" && !isNaN(t.latitude) ? t.latitude : undefined;
    let lng = typeof t.longitude === "number" && !isNaN(t.longitude) ? t.longitude : undefined;

    if (lat === undefined || lng === undefined) {
      const cityKey = (typeof t.city === "string" ? t.city.trim().toLowerCase() : "lahore") || "lahore";
      const baseCoords = CITY_COORDINATES[cityKey] || CITY_COORDINATES["lahore"];
      const offset = getDeterministicOffset(String(t.id || "default"));
      lat = parseFloat((baseCoords.lat + offset.latOffset).toFixed(6));
      lng = parseFloat((baseCoords.lng + offset.lngOffset).toFixed(6));
    }

    return {
      ...t,
      latitude: lat,
      longitude: lng,
    };
  });

  if (cityQuery && cityQuery !== "all") {
    records = records.filter((t) => {
      const c = typeof t.city === "string" ? t.city.toLowerCase() : "";
      return c.includes(cityQuery);
    });
  }

  if (searchQuery) {
    records = records.filter((t) => {
      const shopName = typeof t.shop_name === "string" ? t.shop_name.toLowerCase() : "";
      const address = typeof t.address === "string" ? t.address.toLowerCase() : "";
      const city = typeof t.city === "string" ? t.city.toLowerCase() : "";
      const specialties = Array.isArray(t.specialties) ? t.specialties.join(" ").toLowerCase() : "";
      return (
        shopName.includes(searchQuery) ||
        address.includes(searchQuery) ||
        city.includes(searchQuery) ||
        specialties.includes(searchQuery)
      );
    });
  }

  success(res, records, "Tailors map data fetched successfully");
};

export const getTailorById: RequestHandler = async (req, res) => {
  const tailor = await tailorsService.getTailorById(asString(req.params.tailorId));
  success(res, tailor, "Tailor fetched successfully");
};

export const getTailorServices: RequestHandler = async (req, res) => {
  const services = await tailorsService.getTailorServices(asString(req.params.tailorId));
  success(res, services, "Tailor services fetched successfully");
};

export const getTailorAvailability: RequestHandler = async (req, res) => {
  const availability = await tailorsService.getTailorAvailability(asString(req.params.tailorId));
  success(res, availability, "Tailor availability fetched successfully");
};

export const getTailorReviews: RequestHandler = async (req, res) => {
  const tailor = await tailorsService.getTailorById(asString(req.params.tailorId));
  success(res, tailor ? (tailor as Record<string, unknown>).reviews ?? [] : [], "Tailor reviews fetched successfully");
};

export const createTailor: RequestHandler = async (req, res) => {
  const created = await tailorsService.createTailor(req.user?.id, req.userRole, req.body);
  success(res, created, "Tailor profile created successfully", 201);
};

export const updateTailor: RequestHandler = async (req, res) => {
  const updated = await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Tailor profile updated successfully");
};

export const deleteTailor: RequestHandler = async (req, res) => {
  await tailorsService.deleteTailor(asString(req.params.tailorId), req.user?.id, req.userRole);
  success(res, null, "Tailor profile deleted successfully");
};

export const addGalleryImage: RequestHandler = async (req, res) => {
  const updated = await tailorsService.addGalleryImage(asString(req.params.tailorId), req.user?.id, req.userRole, req.file, req.body);
  success(res, updated, "Gallery image added successfully", 201);
};

export const deleteGalleryImage: RequestHandler = async (req, res) => {
  await tailorsService.updateTailor(asString(req.params.tailorId), req.user?.id, req.userRole, { removeImageId: asString(req.params.imageId) });
  success(res, null, "Gallery image deleted successfully");
};

export const requestVerification: RequestHandler = async (req, res) => {
  const updated = await tailorsService.requestVerification(asString(req.params.tailorId), req.user?.id, req.userRole, req.file, req.body);
  success(res, updated, "Verification requested successfully");
};

export const uploadTailorBanner: RequestHandler = async (req, res) => {
  const updated = await tailorsService.uploadTailorBanner(asString(req.params.tailorId), req.user?.id, req.userRole, req.file, req.body);
  success(res, updated, "Shop banner updated successfully");
};

export const compareTailors: RequestHandler = async (req, res) => {
  success(res, { comparison: req.body }, "Tailors compared successfully");
};

export const addTailorService: RequestHandler = async (req, res) => {
  const created = await tailorsService.addTailorService(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, created, "Service added successfully", 201);
};

export const updateTailorService: RequestHandler = async (req, res) => {
  const updated = await tailorsService.updateTailorService(asString(req.params.serviceId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Service updated successfully");
};

export const deleteTailorService: RequestHandler = async (req, res) => {
  await tailorsService.deleteTailorService(asString(req.params.serviceId), req.user?.id, req.userRole);
  success(res, null, "Service deleted successfully");
};

export const addTailorAvailability: RequestHandler = async (req, res) => {
  const created = await tailorsService.addTailorAvailability(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, created, "Availability schedule saved successfully", 201);
};

export const setTailorAvailability: RequestHandler = async (req, res) => {
  const updated = await tailorsService.setTailorAvailability(asString(req.params.tailorId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Availability schedule updated successfully");
};

export const updateAvailabilitySlot: RequestHandler = async (req, res) => {
  const updated = await tailorsService.updateAvailabilitySlot(asString(req.params.slotId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Availability slot updated successfully");
};

export const deleteAvailabilitySlot: RequestHandler = async (req, res) => {
  await tailorsService.deleteAvailabilitySlot(asString(req.params.slotId), req.user?.id, req.userRole);
  success(res, null, "Availability slot deleted successfully");
};
