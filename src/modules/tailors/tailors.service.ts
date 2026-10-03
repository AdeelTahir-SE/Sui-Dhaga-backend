import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { storageService } from "../../services/storage.service.js";
import { AppError } from "../../utils/app-error.js";

export const tailorsService = {
  async getTailors(page = 1, limit = 20) {
    return fetchTableData({
      table: "tailors",
      select: "*, profile:profiles(*)",
      page,
      limit,
      orderColumn: "rating",
      ascending: false,
    });
  },

  async getNearbyTailors(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    city?: string;
    minRating?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const client = getDbClient();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;
    const radiusMeters = (params.radiusKm || 50) * 1000;

    // Call Supabase PostGIS RPC function
    const { data, error } = await client.rpc("get_nearby_tailors", {
      user_lat: params.lat,
      user_lng: params.lng,
      max_distance_meters: radiusMeters,
      p_limit: limit,
      p_offset: offset,
      p_city: params.city || null,
      p_min_rating: params.minRating || null,
      p_search: params.search || null,
    });

    if (error) {
      console.warn("PostGIS get_nearby_tailors RPC returned error, falling back to table query:", error.message);
      return this.fallbackNearbyTailors(params, page, limit);
    }

    const records = (data || []).map((t: any) => {
      const distMeters = typeof t.distance_meters === "number" ? t.distance_meters : null;
      const distKm = distMeters != null ? parseFloat((distMeters / 1000).toFixed(1)) : null;
      const distStr =
        distMeters != null
          ? distMeters < 1000
            ? `${Math.round(distMeters)} m away`
            : `${distKm} km away`
          : null;

      return {
        ...t,
        distance_meters: distMeters,
        distance_km: distKm,
        distance: distStr,
      };
    });

    return {
      records,
      total: records.length,
      page,
      limit,
    };
  },

  async fallbackNearbyTailors(
    params: {
      lat: number;
      lng: number;
      radiusKm?: number;
      city?: string;
      minRating?: number;
      search?: string;
    },
    page = 1,
    limit = 20
  ) {
    const client = getDbClient();
    let query = client.from("tailors").select("*, profile:profiles(*)");

    if (params.city && params.city.toLowerCase() !== "all") {
      query = query.ilike("city", `%${params.city}%`);
    }
    if (params.minRating) {
      query = query.gte("rating", params.minRating);
    }

    const { data, error } = await query;
    if (error) throw new AppError(error.message, 400);

    let records = (data || []) as Array<Record<string, unknown>>;

    if (params.search) {
      const q = params.search.toLowerCase();
      records = records.filter((t) => {
        const name = String(t.shop_name || "").toLowerCase();
        const addr = String(t.address || "").toLowerCase();
        const city = String(t.city || "").toLowerCase();
        return name.includes(q) || addr.includes(q) || city.includes(q);
      });
    }

    const radiusKm = params.radiusKm || 50;
    records = records
      .map((t) => {
        const tLat = typeof t.latitude === "number" ? t.latitude : undefined;
        const tLng = typeof t.longitude === "number" ? t.longitude : undefined;
        if (typeof tLat === "number" && typeof tLng === "number") {
          const dLat = ((tLat - params.lat) * Math.PI) / 180;
          const dLng = ((tLng - params.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((params.lat * Math.PI) / 180) *
              Math.cos((tLat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = parseFloat((6371 * c).toFixed(1));
          return {
            ...t,
            distance_km: distanceKm,
            distance_meters: Math.round(distanceKm * 1000),
            distance: `${distanceKm} km away`,
          };
        }
        return { ...t, distance_km: null, distance_meters: null, distance: null };
      })
      .filter((t) => typeof t.distance_km === "number" && t.distance_km <= radiusKm)
      .sort((a, b) => {
        const distA = typeof a.distance_km === "number" ? a.distance_km : 999999;
        const distB = typeof b.distance_km === "number" ? b.distance_km : 999999;
        return distA - distB;
      });

    const offset = (page - 1) * limit;
    const paginatedRecords = records.slice(offset, offset + limit);

    return {
      records: paginatedRecords,
      total: records.length,
      page,
      limit,
    };
  },

  async getTailorById(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .select("*, profile:profiles(*), services:tailor_services(*), availability:tailor_availability(*), gallery:tailor_gallery(*), reviews(*)")
      .eq("id", tailorId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async createTailor(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("tailors")
      .insert({ ...mapped, user_id: userId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateTailor(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    let query = client.from("tailors").update(mapped).eq("id", tailorId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteTailor(tailorId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "tailors",
      id: tailorId,
      userId,
      userRole,
    });
  },

  async getTailorServices(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailor_services")
      .select("*")
      .eq("tailor_id", tailorId)
      .eq("is_active", true);

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addTailorService(tailorId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("tailor_services")
      .insert({ ...mapped, tailor_id: tailorId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateTailorService(serviceId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("tailor_services")
      .update(mapped)
      .eq("id", serviceId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteTailorService(serviceId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { error } = await client.from("tailor_services").delete().eq("id", serviceId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async getTailorAvailability(tailorId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("tailor_availability")
      .select("*")
      .eq("tailor_id", tailorId);

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addTailorAvailability(tailorId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("tailor_availability")
      .insert({ ...mapped, tailor_id: tailorId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateAvailabilitySlot(slotId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: updated, error } = await client
      .from("tailor_availability")
      .update(mapped)
      .eq("id", slotId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async addGalleryImage(tailorId: string, _userId: string | undefined, _userRole: string | undefined, file?: Express.Multer.File, data: Record<string, unknown> = {}) {
    let imageUrl = (data.imageUrl || data.image) as string;
    if (file) {
      const fileExt = file.originalname?.split(".").pop() || "png";
      const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
      const path = `${tailorId}/gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "png"}`;
      const { url } = await storageService.uploadFile("tailor-gallery", path, file.buffer, file.mimetype);
      imageUrl = url;
    }

    if (!imageUrl) {
      throw new AppError("Gallery image file or imageUrl is required", 400);
    }

    const client = getDbClient();
    const { data: created, error } = await client
      .from("tailor_gallery")
      .insert({
        tailor_id: tailorId,
        image_url: imageUrl,
        caption: data.caption || "",
      })
      .select()
      .single();

    if (error) {
      // Fallback: update tailor's portfolio/gallery column directly if tailor_gallery table is not used
      const { data: tailor, error: tailorError } = await client
        .from("tailors")
        .update({
          portfolio: [{ id: `img-${Date.now()}`, url: imageUrl, caption: data.caption || "" }],
        })
        .eq("id", tailorId)
        .select()
        .single();
      if (tailorError) throw new AppError(error.message, 400);
      return tailor;
    }

    return created;
  },

  async requestVerification(tailorId: string, _userId: string | undefined, _userRole: string | undefined, file?: Express.Multer.File, data: Record<string, unknown> = {}) {
    let documentUrl = (data.documentUrl || data.document) as string;
    if (file) {
      const fileExt = file.originalname?.split(".").pop() || "pdf";
      const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
      const path = `${tailorId}/verify-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "pdf"}`;
      const { url } = await storageService.uploadFile("verification-documents", path, file.buffer, file.mimetype);
      documentUrl = url;
    }

    const client = getDbClient();
    const updatePayload: Record<string, unknown> = {
      verification_status: "pending",
      verified: false,
    };
    if (documentUrl) {
      updatePayload.verification_document_url = documentUrl;
    }

    const { data: updated, error } = await client
      .from("tailors")
      .update(updatePayload)
      .eq("id", tailorId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async uploadTailorBanner(tailorId: string, userId: string | undefined, userRole: string | undefined, file?: Express.Multer.File, data: Record<string, unknown> = {}) {
    let bannerUrl = (data.bannerUrl || data.banner) as string;
    if (file) {
      const fileExt = file.originalname?.split(".").pop() || "png";
      const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
      const path = `${tailorId}/banner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "png"}`;
      const { url } = await storageService.uploadFile("tailor-banners", path, file.buffer, file.mimetype);
      bannerUrl = url;
    }

    if (!bannerUrl) {
      throw new AppError("Banner image file or bannerUrl is required", 400);
    }

    const client = getDbClient();
    let query = client
      .from("tailors")
      .update({ banner_url: bannerUrl })
      .eq("id", tailorId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteAvailabilitySlot(slotId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { error } = await client.from("tailor_availability").delete().eq("id", slotId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },
};

