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

