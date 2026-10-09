import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { storageService } from "../../services/storage.service.js";
import { cacheService } from "../../services/cache.service.js";
import { AppError } from "../../utils/app-error.js";

export const tailorsService = {
  invalidateTailorCache(tailorId?: string) {
    if (tailorId) {
      cacheService.del(`tailor:${tailorId}`);
    }
    cacheService.delByPattern("tailors:*");
  },

  async getTailors(page = 1, limit = 20, organization?: string) {
    const cacheKey = `tailors:list:${page}:${limit}:${organization || "all"}`;
    const cached = cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const filters: Record<string, unknown> = {};
    if (organization) {
      filters.organization_name = organization;
    }

    const result = await fetchTableData({
      table: "tailors",
      select: "id, user_id, shop_name, specialties, city, address, experience_years, bio, rating, review_count, banner_url, verification_status, verified, latitude, longitude, organization_name, created_at, profile:profiles(id, full_name, avatar_url, phone, bio, address)",
      page,
      limit,
      orderColumn: "rating",
      ascending: false,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });

    cacheService.set(cacheKey, result, 60);
    return result;
  },

  async getNearbyTailors(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    city?: string;
    minRating?: number;
    search?: string;
    organization?: string;
    page?: number;
    limit?: number;
  }) {
    const cacheKey = `tailors:nearby:${JSON.stringify(params)}`;
    const cached = cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const client = getDbClient();
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;
    const radiusMeters = Math.min(25, params.radiusKm || 25) * 1000;

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
      p_organization: params.organization || null,
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
        distance_km: distKm,
        distance: distStr,
      };
    });

    const result = {
      records,
      total: records.length,
      page,
      limit,
    };
    cacheService.set(cacheKey, result, 60);
    return result;
  },

  async fallbackNearbyTailors(
    params: {
      lat: number;
      lng: number;
      radiusKm?: number;
      city?: string;
      minRating?: number;
      search?: string;
      organization?: string;
    },
    page = 1,
    limit = 20
  ) {
    const client = getDbClient();
    let query = client.from("tailors").select("id, user_id, shop_name, specialties, city, address, experience_years, bio, rating, review_count, banner_url, verification_status, verified, latitude, longitude, organization_name, created_at, profile:profiles(id, full_name, avatar_url, phone, bio, address)");

    if (params.city && params.city.toLowerCase() !== "all") {
      query = query.ilike("city", `%${params.city}%`);
    }
    if (params.minRating) {
      query = query.gte("rating", params.minRating);
    }
    if (params.organization) {
      query = query.ilike("organization_name", params.organization);
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

    const radiusKm = Math.min(25, params.radiusKm || 25);
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
            distance: `${distanceKm} km away`,
          };
        }
        return { ...t, distance_km: null, distance: null };
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
    const effectiveTailorId = (await this.resolveTailorId(tailorId)) || tailorId;
    const cacheKey = `tailor:${effectiveTailorId}`;
    const cached = cacheService.get<any>(cacheKey);
    if (cached) return cached;

    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .select("id, user_id, shop_name, specialties, city, address, experience_years, bio, rating, review_count, banner_url, verification_status, verified, latitude, longitude, organization_name, created_at, profile:profiles(id, full_name, avatar_url, phone, bio, address), services:tailor_services(id, title, price, description, category, is_active), availability:tailor_availability(*), gallery:tailor_gallery(id, image_url, caption, display_order), reviews(id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url))")
      .eq("id", effectiveTailorId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (data) {
      const enriched = {
        ...data,
        location: typeof data.location === "object" && data.location !== null ? data.location : {
          city: data.city,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };
      cacheService.set(cacheKey, enriched, 60);
      return enriched;
    }
    return data;
  },

  async getTailorByUserId(userId: string | undefined): Promise<any> {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data, error } = await client
      .from("tailors")
      .select("id, user_id, shop_name, specialties, city, address, experience_years, bio, rating, review_count, banner_url, verification_status, verified, latitude, longitude, organization_name, created_at, profile:profiles(id, full_name, avatar_url, phone, bio, address), services:tailor_services(id, title, price, description, category, is_active), availability:tailor_availability(*), gallery:tailor_gallery(id, image_url, caption, display_order), reviews(id, rating, comment, images, created_at, customer:profiles!customer_id(id, full_name, avatar_url))")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (data) {
      return {
        ...data,
        location: typeof data.location === "object" && data.location !== null ? data.location : {
          city: data.city,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      };
    }
    return data;
  },

  async createTailor(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>): Promise<any> {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();

    // If tailor row already exists for this user, route to updateTailor to prevent unique constraint crash
    const { data: existing } = await client
      .from("tailors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      return this.updateTailor(existing.id, userId, _userRole, data);
    }

    const cleanData = { ...data };
    const orgValue =
      cleanData.organizationName !== undefined
        ? cleanData.organizationName
        : cleanData.organization !== undefined
        ? cleanData.organization
        : cleanData.organization_name;

    if (orgValue !== undefined) {
      cleanData.organizationName =
        typeof orgValue === "string" ? orgValue.trim() || null : orgValue;
    }
    delete cleanData.organization;
    delete cleanData.organization_name;

    if (typeof cleanData.location === "object" && cleanData.location !== null) {
      const loc = cleanData.location as Record<string, unknown>;
      if (cleanData.latitude === undefined && loc.latitude !== undefined && loc.latitude !== null) {
        cleanData.latitude = Number(loc.latitude);
      }
      if (cleanData.longitude === undefined && loc.longitude !== undefined && loc.longitude !== null) {
        cleanData.longitude = Number(loc.longitude);
      }
      if (!cleanData.city && typeof loc.city === "string") {
        cleanData.city = loc.city;
      }
      if (!cleanData.address && typeof loc.address === "string") {
        cleanData.address = loc.address;
      }
    }
    delete cleanData.location;

    if (cleanData.latitude !== undefined && cleanData.latitude !== null) {
      cleanData.latitude = Number(cleanData.latitude);
    }
    if (cleanData.longitude !== undefined && cleanData.longitude !== null) {
      cleanData.longitude = Number(cleanData.longitude);
    }

    const mapped = toSnakeCase(cleanData);
    const { data: created, error } = await client
      .from("tailors")
      .insert({ ...mapped, user_id: userId })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    this.invalidateTailorCache();
    return {
      ...created,
      location: {
        city: created.city,
        address: created.address,
        latitude: created.latitude,
        longitude: created.longitude,
      },
    };
  },

  async updateTailor(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>): Promise<any> {
    const client = getDbClient();
    const effectiveTailorId = (await this.resolveTailorId(tailorId, userId)) || tailorId;

    const cleanData = { ...data };
    const orgValue =
      cleanData.organizationName !== undefined
        ? cleanData.organizationName
        : cleanData.organization !== undefined
        ? cleanData.organization
        : cleanData.organization_name;

    if (orgValue !== undefined) {
      cleanData.organizationName =
        typeof orgValue === "string" ? orgValue.trim() || null : orgValue;
    }
    delete cleanData.organization;
    delete cleanData.organization_name;

    if (typeof cleanData.location === "object" && cleanData.location !== null) {
      const loc = cleanData.location as Record<string, unknown>;
      if (cleanData.latitude === undefined && loc.latitude !== undefined && loc.latitude !== null) {
        cleanData.latitude = Number(loc.latitude);
      }
      if (cleanData.longitude === undefined && loc.longitude !== undefined && loc.longitude !== null) {
        cleanData.longitude = Number(loc.longitude);
      }
      if (!cleanData.city && typeof loc.city === "string") {
        cleanData.city = loc.city;
      }
      if (!cleanData.address && typeof loc.address === "string") {
        cleanData.address = loc.address;
      }
    }
    delete cleanData.location;

    if (cleanData.latitude !== undefined && cleanData.latitude !== null) {
      cleanData.latitude = Number(cleanData.latitude);
    }
    if (cleanData.longitude !== undefined && cleanData.longitude !== null) {
      cleanData.longitude = Number(cleanData.longitude);
    }

    const mapped = toSnakeCase(cleanData);
    let query = client.from("tailors").update(mapped).eq("id", effectiveTailorId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) {
      // If no tailor record was found to update and we have a valid userId, fallback to createTailor
      if (error.code === "PGRST116" && userId) {
        return this.createTailor(userId, userRole, data);
      }
      throw new AppError(error.message, 400);
    }
    this.invalidateTailorCache(effectiveTailorId);
    if (tailorId !== effectiveTailorId) {
      this.invalidateTailorCache(tailorId);
    }
    return {
      ...updated,
      location: {
        city: updated.city,
        address: updated.address,
        latitude: updated.latitude,
        longitude: updated.longitude,
      },
    };
  },

  async deleteTailor(tailorId: string, userId: string | undefined, userRole: string | undefined) {
    const res = await deleteTableData({
      table: "tailors",
      id: tailorId,
      userId,
      userRole,
    });
    this.invalidateTailorCache(tailorId);
    return res;
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
    this.invalidateTailorCache(tailorId);
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
    this.invalidateTailorCache();
    return updated;
  },

  async deleteTailorService(serviceId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { error } = await client.from("tailor_services").delete().eq("id", serviceId);
    if (error) throw new AppError(error.message, 400);
    this.invalidateTailorCache();
    return true;
  },

  async resolveTailorId(tailorId: string, userId?: string): Promise<string | null> {
    const client = getDbClient();
    const cleanId = tailorId ? tailorId.replace(/^tailor_/, "").trim() : "";
    const isValidUuid = (id?: string | null): boolean =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    // 1. If cleanId is a valid UUID, search by id or user_id
    if (isValidUuid(cleanId)) {
      try {
        const { data: byId } = await client
          .from("tailors")
          .select("id")
          .eq("id", cleanId)
          .maybeSingle();
        if (byId?.id) return byId.id;

        const { data: byUser } = await client
          .from("tailors")
          .select("id")
          .eq("user_id", cleanId)
          .maybeSingle();
        if (byUser?.id) return byUser.id;
      } catch {}
    }

    // 2. If userId is provided and valid UUID, search by user_id
    if (userId && isValidUuid(userId)) {
      try {
        const { data: byAuthUser } = await client
          .from("tailors")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();
        if (byAuthUser?.id) return byAuthUser.id;
      } catch {}
    }

    return null;
  },

  async getTailorAvailability(tailorId: string, userId?: string) {
    const client = getDbClient();

    // Resolve real tailor_id if a user_id or prefixed tailor id was passed
    const effectiveTailorId = await this.resolveTailorId(tailorId, userId);
    if (!effectiveTailorId) {
      return [];
    }

    const { data, error } = await client
      .from("tailor_availability")
      .select("*")
      .eq("tailor_id", effectiveTailorId);

    if (error) throw new AppError(error.message, 400);

    const DAY_ORDER: Record<string, number> = {
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
      Sunday: 7,
    };

    const sorted = (data ?? []).sort((a: any, b: any) => {
      const orderA = DAY_ORDER[a.day_of_week] || 99;
      const orderB = DAY_ORDER[b.day_of_week] || 99;
      return orderA - orderB;
    });

    return sorted;
  },

  async setTailorAvailability(
    tailorId: string,
    _userId: string | undefined,
    _userRole: string | undefined,
    data: any
  ) {
    const client = getDbClient();

    // Resolve effective tailor ID
    let effectiveTailorId = await this.resolveTailorId(tailorId, _userId);

    // If tailor row doesn't exist yet, auto-create tailor row for authenticated user
    const isValidUuid = (id?: string | null): boolean =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    if (!effectiveTailorId && _userId && isValidUuid(_userId)) {
      try {
        const { data: newTailor } = await client
          .from("tailors")
          .insert({
            user_id: _userId,
            shop_name: "Tailor Shop",
            city: "Lahore",
            specialties: ["custom-stitching"],
            experience_years: 1,
            rating: 5.0,
            review_count: 0,
            verification_status: "pending",
            verified: false,
          })
          .select("id")
          .single();
        if (newTailor?.id) {
          effectiveTailorId = newTailor.id;
        }
      } catch {}
    }

    if (!effectiveTailorId) {
      throw new AppError("Tailor profile not found. Please set up your tailor profile first.", 404);
    }

    const rawSlots: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.slots)
      ? data.slots
      : Array.isArray(data?.timings)
      ? data.timings
      : Array.isArray(data?.dayTimings)
      ? data.dayTimings
      : [data];

    if (!rawSlots.length || !rawSlots[0]) {
      return [];
    }

    // If multiple days provided (batch schedule), clear previous schedule for clean replacement
    if (rawSlots.length > 1) {
      await client
        .from("tailor_availability")
        .delete()
        .eq("tailor_id", effectiveTailorId);
    }

    const rowsToInsert = rawSlots.map((s) => {
      const day = s.dayOfWeek || s.day_of_week || s.day || "Monday";
      const start = s.startTime || s.start_time || s.openTime || s.open_time || "09:00 AM";
      const end = s.endTime || s.end_time || s.closeTime || s.close_time || "08:00 PM";
      const available =
        s.isAvailable !== undefined
          ? Boolean(s.isAvailable)
          : s.isOpen !== undefined
          ? Boolean(s.isOpen)
          : true;
      const hasBreak = Boolean(s.hasBreak || s.has_break);
      const breakStart = s.breakStart || s.break_start || null;
      const breakEnd = s.breakEnd || s.break_end || null;

      return {
        tailor_id: effectiveTailorId,
        day_of_week: day,
        start_time: start,
        end_time: end,
        is_available: available,
        has_break: hasBreak,
        break_start: breakStart,
        break_end: breakEnd,
      };
    });

    if (rawSlots.length === 1) {
      // Clear previous slot for this single day
      await client
        .from("tailor_availability")
        .delete()
        .eq("tailor_id", effectiveTailorId)
        .eq("day_of_week", rowsToInsert[0].day_of_week);
    }

    // Try inserting with break columns first
    let { data: inserted, error } = await client
      .from("tailor_availability")
      .insert(rowsToInsert)
      .select();

    // Fallback if break columns do not exist yet in database or schema cache
    if (
      error &&
      error.message &&
      (error.message.includes("does not exist") ||
        error.message.includes("Could not find") ||
        error.message.includes("column"))
    ) {
      const basicRows = rowsToInsert.map(({ has_break, break_start, break_end, ...rest }: any) => rest);
      const retry = await client
        .from("tailor_availability")
        .insert(basicRows)
        .select();
      inserted = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);

    this.invalidateTailorCache(effectiveTailorId);
    if (tailorId && tailorId !== effectiveTailorId) {
      this.invalidateTailorCache(tailorId);
    }
    return inserted ?? [];
  },

  async addTailorAvailability(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return this.setTailorAvailability(tailorId, userId, userRole, data);
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
      this.invalidateTailorCache(tailorId);
      return tailor;
    }

    this.invalidateTailorCache(tailorId);
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
    this.invalidateTailorCache(tailorId);
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
    this.invalidateTailorCache(tailorId);
    return updated;
  },

  async deleteAvailabilitySlot(slotId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { error } = await client.from("tailor_availability").delete().eq("id", slotId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },
};

