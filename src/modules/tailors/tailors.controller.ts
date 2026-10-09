import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import {
  tailorsService,
  CITY_COORDINATES,
  getDeterministicOffset,
} from "./tailors.service.js";

export const getTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search =
    typeof req.query.search === "string"
      ? req.query.search.trim()
      : typeof req.query.q === "string"
      ? req.query.q.trim()
      : undefined;
  const city =
    typeof req.query.city === "string" && req.query.city.trim().toLowerCase() !== "all"
      ? req.query.city.trim()
      : undefined;
  const specialty =
    typeof req.query.specialty === "string" && req.query.specialty.trim()
      ? req.query.specialty.trim()
      : undefined;
  const minRating =
    req.query.minRating !== undefined && !isNaN(Number(req.query.minRating))
      ? Number(req.query.minRating)
      : req.query.rating !== undefined && !isNaN(Number(req.query.rating))
      ? Number(req.query.rating)
      : undefined;
  const verified =
    req.query.verified === "true" || String(req.query.verified) === "true";
  let userLat = Number(req.query.lat);
  let userLng = Number(req.query.lng);
  const radius =
    req.query.radius !== undefined && !isNaN(Number(req.query.radius))
      ? Number(req.query.radius)
      : req.query.radiusKm !== undefined && !isNaN(Number(req.query.radiusKm))
      ? Number(req.query.radiusKm)
      : undefined;
  const organization =
    typeof req.query.organization === "string"
      ? req.query.organization
      : typeof req.query.organization_name === "string"
      ? req.query.organization_name
      : typeof req.query.organizationName === "string"
      ? req.query.organizationName
      : undefined;

  if (isNaN(userLat) || isNaN(userLng)) {
    if (city) {
      const baseCoords = CITY_COORDINATES[city.toLowerCase()] || CITY_COORDINATES["islamabad"] || CITY_COORDINATES["lahore"];
      if (baseCoords) {
        userLat = baseCoords.lat;
        userLng = baseCoords.lng;
      }
    }
  }

  const result = await tailorsService.getTailors({
    page,
    limit,
    search,
    city,
    specialty,
    minRating,
    verified,
    lat: !isNaN(userLat) ? userLat : undefined,
    lng: !isNaN(userLng) ? userLng : undefined,
    radiusKm: radius,
    organization,
  });

  paginated(res, result.records, page, limit, result.total, "Tailors fetched successfully");
};

export const getNearbyTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  let userLat = Number(req.query.lat);
  let userLng = Number(req.query.lng);
  const radius = Math.min(100, Math.max(1, Number(req.query.radius) || 25));
  const city = typeof req.query.city === "string" && req.query.city.toLowerCase() !== "all" ? req.query.city : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : typeof req.query.q === "string" ? req.query.q : undefined;
  const minRating = req.query.minRating ? Number(req.query.minRating) : undefined;
  const organization =
    typeof req.query.organization === "string"
      ? req.query.organization
      : typeof req.query.organization_name === "string"
      ? req.query.organization_name
      : typeof req.query.organizationName === "string"
      ? req.query.organizationName
      : undefined;

  if (isNaN(userLat) || isNaN(userLng)) {
    if (city) {
      const baseCoords = CITY_COORDINATES[city.toLowerCase()] || CITY_COORDINATES["islamabad"] || CITY_COORDINATES["lahore"];
      if (baseCoords) {
        userLat = baseCoords.lat;
        userLng = baseCoords.lng;
      }
    }
  }

  if (!isNaN(userLat) && !isNaN(userLng)) {
    const result = await tailorsService.getNearbyTailors({
      lat: userLat,
      lng: userLng,
      radiusKm: radius,
      city,
      search,
      organization,
      minRating,
      page,
      limit,
    });
    return paginated(res, result.records, page, limit, result.total, "Nearby tailors fetched successfully");
  }

  const result = await tailorsService.getTailors({
    page,
    limit,
    search,
    city,
    minRating,
    organization,
  });
  paginated(res, result.records, page, limit, result.total, "Tailors fetched successfully");
};

export const getTailorsMap: RequestHandler = async (req, res) => {
  const cityQuery = typeof req.query.city === "string" ? req.query.city.trim().toLowerCase() : "";
  const searchQuery = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
  let userLat = Number(req.query.lat);
  let userLng = Number(req.query.lng);
  const radius = Math.min(100, Math.max(1, Number(req.query.radius) || 25));

  if ((isNaN(userLat) || isNaN(userLng)) && cityQuery && cityQuery !== "all") {
    const baseCoords = CITY_COORDINATES[cityQuery] || CITY_COORDINATES["lahore"];
    if (baseCoords) {
      userLat = baseCoords.lat;
      userLng = baseCoords.lng;
    }
  }

  let records: Array<Record<string, unknown>> = [];

  // When searching, fetch all tailors first so strict radius won't hide results
  if (searchQuery) {
    const result = await tailorsService.getTailors(1, 100);
    records = result.records as Array<Record<string, unknown>>;
  } else if (!isNaN(userLat) && !isNaN(userLng)) {
    const result = await tailorsService.getNearbyTailors({
      lat: userLat,
      lng: userLng,
      radiusKm: radius,
      city: cityQuery && cityQuery !== "all" ? cityQuery : undefined,
      page: 1,
      limit: 100,
    });
    records = result.records as Array<Record<string, unknown>>;

    // If PostGIS nearby query returned empty, fall back to table
    if (records.length === 0) {
      const allResult = await tailorsService.getTailors(1, 100);
      records = allResult.records as Array<Record<string, unknown>>;
    }
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
      const offset = getDeterministicOffset(String(t.id || t.shop_name || "default"));
      lat = parseFloat((baseCoords.lat + offset.latOffset).toFixed(6));
      lng = parseFloat((baseCoords.lng + offset.lngOffset).toFixed(6));
    }

    let distKm: number | null = null;
    let distStr: string | null = null;
    if (!isNaN(userLat) && !isNaN(userLng) && lat !== undefined && lng !== undefined) {
      const dLat = ((lat - userLat) * Math.PI) / 180;
      const dLng = ((lng - userLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((userLat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distKm = parseFloat((6371 * c).toFixed(1));
      distStr = `${distKm} km away`;
    }

    return {
      ...t,
      latitude: lat,
      longitude: lng,
      location: {
        city: t.city,
        address: t.address,
        latitude: lat,
        longitude: lng,
      },
      distance_km: distKm ?? (typeof t.distance_km === "number" ? t.distance_km : null),
      distance: distStr ?? (typeof t.distance === "string" ? t.distance : null),
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
      const bio = typeof t.bio === "string" ? t.bio.toLowerCase() : "";
      const profileName = typeof (t.profile as any)?.full_name === "string" ? (t.profile as any).full_name.toLowerCase() : "";
      return (
        shopName.includes(searchQuery) ||
        address.includes(searchQuery) ||
        city.includes(searchQuery) ||
        specialties.includes(searchQuery) ||
        bio.includes(searchQuery) ||
        profileName.includes(searchQuery)
      );
    });
  }

  if (!isNaN(userLat) && !isNaN(userLng)) {
    records.sort((a, b) => {
      const distA = typeof a.distance_km === "number" ? a.distance_km : 999999;
      const distB = typeof b.distance_km === "number" ? b.distance_km : 999999;
      return distA - distB;
    });
  }

  success(res, records, "Tailors map data fetched successfully");
};

export const getMyTailorProfile: RequestHandler = async (req, res) => {
  const tailor = await tailorsService.getTailorByUserId(req.user?.id);
  if (!tailor) {
    return res.status(404).json({ success: false, message: "Tailor profile not found", data: null });
  }
  success(res, tailor, "Tailor profile fetched successfully");
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
  const availability = await tailorsService.getTailorAvailability(asString(req.params.tailorId), req.user?.id);
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
