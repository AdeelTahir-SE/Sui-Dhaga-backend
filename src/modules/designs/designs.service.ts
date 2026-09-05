import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { aiService } from "../../services/ai.service.js";
import { AppError } from "../../utils/app-error.js";

export const designsService = {
  async getDesigns(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    return fetchTableData({
      table: "designs",
      userId,
      userRole,
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getDesignById(designId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("designs")
      .select("*, shared_tailor:tailors!shared_with_tailor_id(*)")
      .eq("id", designId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async createDesign(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("designs")
      .insert({
        ...mapped,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updateDesign(designId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    let query = client.from("designs").update(mapped).eq("id", designId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteDesign(designId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "designs",
      id: designId,
      userId,
      userRole,
    });
  },

  async textToDesign(userId: string | undefined, userRole: string | undefined, prompt: string) {
    const aiResult = await aiService.generateTextToDesign(prompt);
    return this.createDesign(userId, userRole, {
      type: "text-to-design",
      prompt,
      enhanced_prompt: aiResult.promptUsed,
      image_url: aiResult.imageUrl,
      model_used: aiResult.model,
      status: "completed",
    });
  },

  async imageToDesign(userId: string | undefined, userRole: string | undefined, imageUrl: string, prompt?: string) {
    const aiResult = await aiService.generateImageToDesign(imageUrl, prompt);
    return this.createDesign(userId, userRole, {
      type: "image-to-design",
      original_image_url: imageUrl,
      prompt,
      enhanced_prompt: aiResult.promptUsed,
      image_url: aiResult.imageUrl,
      model_used: aiResult.model,
      status: "completed",
    });
  },

  async sketchToDesign(userId: string | undefined, userRole: string | undefined, sketchUrl: string, prompt?: string) {
    const aiResult = await aiService.generateSketchToDesign(sketchUrl, prompt);
    return this.createDesign(userId, userRole, {
      type: "sketch-to-design",
      sketch_url: sketchUrl,
      prompt,
      enhanced_prompt: aiResult.promptUsed,
      image_url: aiResult.imageUrl,
      model_used: aiResult.model,
      status: "completed",
    });
  },

  async duplicateDesign(designId: string, userId: string | undefined, userRole: string | undefined) {
    const original = await this.getDesignById(designId, userId, userRole);
    if (!original) throw new AppError("Design not found", 404);
    const { id: _, created_at: __, updated_at: ___, ...rest } = original as Record<string, unknown>;
    return this.createDesign(userId, userRole, { ...rest, duplicated_from_id: designId });
  },

  async shareWithTailor(designId: string, userId: string | undefined, userRole: string | undefined, tailorId: string) {
    return this.updateDesign(designId, userId, userRole, { shared_with_tailor_id: tailorId });
  },

  async exportPdf(designId: string, userId: string | undefined, userRole: string | undefined) {
    const pdfUrl = `/pdfs/design-${designId}.pdf`;
    await this.updateDesign(designId, userId, userRole, { pdf_url: pdfUrl });
    return { designId, pdfUrl };
  },
};

