import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const designsService = {
  async getDesigns(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "designs",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async getDesignById(designId: string, userId: string | undefined, userRole: string | undefined) {
    const { singleRecord } = await fetchResources({
      resourceType: "designs",
      id: designId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async createDesign(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "designs",
      userId,
      userRole,
      data,
    });
  },

  async updateDesign(designId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "designs",
      id: designId,
      userId,
      userRole,
      data,
    });
  },

  async deleteDesign(designId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "designs",
      id: designId,
      userId,
      userRole,
    });
  },

  async textToDesign(userId: string | undefined, userRole: string | undefined, prompt: string) {
    return this.createDesign(userId, userRole, { type: "text-to-design", prompt, status: "generated" });
  },

  async imageToDesign(userId: string | undefined, userRole: string | undefined, imageUrl: string) {
    return this.createDesign(userId, userRole, { type: "image-to-design", imageUrl, status: "generated" });
  },

  async sketchToDesign(userId: string | undefined, userRole: string | undefined, sketchUrl: string) {
    return this.createDesign(userId, userRole, { type: "sketch-to-design", sketchUrl, status: "generated" });
  },

  async duplicateDesign(designId: string, userId: string | undefined, userRole: string | undefined) {
    const original = await this.getDesignById(designId, userId, userRole);
    return this.createDesign(userId, userRole, { ...(original ?? {}), duplicatedFrom: designId });
  },

  async shareWithTailor(designId: string, userId: string | undefined, userRole: string | undefined, tailorId: string) {
    return this.updateDesign(designId, userId, userRole, { sharedWithTailor: tailorId });
  },

  async exportPdf(designId: string, userId: string | undefined, userRole: string | undefined) {
    const pdfUrl = `/pdfs/design-${designId}.pdf`;
    await this.updateDesign(designId, userId, userRole, { pdfUrl });
    return { designId, pdfUrl };
  },
};
