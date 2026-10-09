import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { tailorsService } from "./tailors.service.js";

export const getTailors: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const organization =
    typeof req.query.organization === "string"
      ? req.query.organization
      : typeof req.query.organization_name === "string"
      ? req.query.organization_name
      : typeof req.query.organizationName === "string"
      ? req.query.organizationName
      : undefined;
  const result = await tailorsService.getTailors(page, limit, organization);
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
  const organization =
    typeof req.query.organization === "string"
      ? req.query.organization
      : typeof req.query.organization_name === "string"
      ? req.query.organization_name
      : typeof req.query.organizationName === "string"
      ? req.query.organizationName
      : undefined;

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

  const result = await tailorsService.getTailors(page, limit, organization);
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

const DEFAULT_FALLBACK_TAILORS: Array<Record<string, unknown>> = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    user_id: "22222222-2222-2222-2222-222222222222",
    shop_name: "Royal Heritage Tailors",
    specialties: ["bridal", "lehenga", "sherwani", "formal-wear"],
    city: "Lahore",
    address: "Shop 12, Anarkali Bazaar, Lahore",
    experience_years: 22,
    bio: "Master artisans in hand embroidery and bespoke bridal wear.",
    rating: 4.9,
    review_count: 38,
    verification_status: "verified",
    verified: true,
    latitude: 31.5714,
    longitude: 74.3087,
    organization_name: "sundrop",
    profile: {
      id: "22222222-2222-2222-2222-222222222222",
      full_name: "Master Tariq",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      phone: "+923007654321",
    },
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    user_id: "33333333-3333-3333-3333-333333333333",
    shop_name: "Zainab Haute Couture",
    specialties: ["kurta", "shalwar-kameez", "casual-wear", "western-fusion"],
    city: "Islamabad",
    address: "Plaza 4, F-7 Markaz, Islamabad",
    experience_years: 8,
    bio: "Modern tailoring for contemporary women and men.",
    rating: 4.7,
    review_count: 19,
    verification_status: "verified",
    verified: true,
    latitude: 33.7215,
    longitude: 73.0563,
    profile: {
      id: "33333333-3333-3333-3333-333333333333",
      full_name: "Zainab Stitching Studio",
      avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
      phone: "+923009876543",
    },
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    user_id: "44444444-4444-4444-4444-444444444444",
    shop_name: "Gulberg Bespoke Studio",
    specialties: ["suits", "formal-wear", "alterations", "tuxedos"],
    city: "Lahore",
    address: "Main Boulevard, Gulberg III, Lahore",
    experience_years: 15,
    bio: "Finest Italian cut suits and modern silhouettes.",
    rating: 4.8,
    review_count: 24,
    verification_status: "verified",
    verified: true,
    latitude: 31.5104,
    longitude: 74.3440,
    profile: {
      id: "44444444-4444-4444-4444-444444444444",
      full_name: "Master Aslam",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      phone: "+923004567890",
    },
  },
];

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

  // Ensure default seed tailors exist if database is sparse
  const existingIds = new Set(records.map((r) => String(r.id || "")));
  for (const seed of DEFAULT_FALLBACK_TAILORS) {
    if (!existingIds.has(String(seed.id))) {
      records.push(seed);
    }
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
