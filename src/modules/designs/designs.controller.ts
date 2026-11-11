import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { designsService } from "./designs.service.js";

export const getDesigns: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const isFavorite =
    req.query.isFavorite !== undefined
      ? req.query.isFavorite === "true"
      : req.query.favorite !== undefined
        ? req.query.favorite === "true"
        : undefined;
  const isTrashed =
    req.query.isTrashed !== undefined
      ? req.query.isTrashed === "true"
      : req.query.trashed !== undefined
        ? req.query.trashed === "true"
        : undefined;

  const result = await designsService.getDesigns(req.user?.id, req.userRole, page, limit, {
    type: typeof req.query.type === "string" ? req.query.type : undefined,
    category: typeof req.query.category === "string" ? req.query.category : undefined,
    search: typeof req.query.search === "string" ? req.query.search : typeof req.query.q === "string" ? req.query.q : undefined,
    isFavorite,
    isTrashed,
    status: typeof req.query.status === "string" ? req.query.status : undefined,
  });
  paginated(res, result.records, page, limit, result.total, "Designs fetched successfully");
};

export const getDesignTemplates: RequestHandler = async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : typeof req.query.q === "string" ? req.query.q : undefined;
  const templates = await designsService.getTemplates(category, search);
  success(res, templates, "Design templates fetched successfully");
};

export const getDesignById: RequestHandler = async (req, res) => {
  const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, design, "Design fetched successfully");
};

export const createDesign: RequestHandler = async (req, res) => {
  const created = await designsService.createDesign(req.user?.id, req.userRole, req.body);
  success(res, created, "Design saved successfully", 201);
};

export const generateDesign: RequestHandler = async (req, res) => {
  const uploadedFiles = req.files as Record<string, Express.Multer.File[]> | undefined;
  const files = {
    image: uploadedFiles?.image?.[0] ?? req.file,
    sketch: uploadedFiles?.sketch?.[0],
    file: uploadedFiles?.file?.[0],
  };
  const result = await designsService.generateDesign(req.user?.id, req.userRole, req.body, files);
  success(res, result, "AI design generated successfully", 201);
};

export const textToDesign: RequestHandler = async (req, res) => {
  const result = await designsService.textToDesign(req.user?.id, req.userRole, req.body.prompt, req.body);
  success(res, result, "Text to design generated successfully", 201);
};

export const imageToDesign: RequestHandler = async (req, res) => {
  const prompt = req.body.instructions || req.body.prompt;
  const result = await designsService.imageToDesign(req.user?.id, req.userRole, req.body.imageUrl, req.file, prompt);
  success(res, result, "Image to design generated successfully", 201);
};

export const sketchToDesign: RequestHandler = async (req, res) => {
  const prompt = req.body.instructions || req.body.prompt;
  const result = await designsService.sketchToDesign(req.user?.id, req.userRole, req.body.sketchUrl, req.file, prompt);
  success(res, result, "Sketch to design generated successfully", 201);
};

export const designChat: RequestHandler = async (req, res) => {
  const designId = req.params.designId ? asString(req.params.designId) : req.body.designId;
  const result = await designsService.chatDesign(req.user?.id, req.userRole, {
    message: req.body.message || req.body.prompt || String(req.body.text || "Suggest an outfit concept"),
    designId,
    history: req.body.history,
    generateImage: Boolean(req.body.generateImage),
    context: req.body.context,
  });
  success(res, result, "Design chat processed successfully");
};

export const updateDesign: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Design updated successfully");
};

export const deleteDesign: RequestHandler = async (req, res) => {
  await designsService.deleteDesign(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, null, "Design deleted successfully");
};

export const duplicateDesign: RequestHandler = async (req, res) => {
  const duplicated = await designsService.duplicateDesign(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, duplicated, "Design duplicated successfully", 201);
};

export const shareWithTailor: RequestHandler = async (req, res) => {
  const shared = await designsService.shareWithTailor(asString(req.params.designId), req.user?.id, req.userRole, req.body.tailorId);
  success(res, shared, "Design shared with tailor successfully");
};

export const getDesignChat: RequestHandler = async (req, res) => {
  const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, (design as Record<string, unknown>)?.chatHistory ?? [], "Design chat history fetched");
};

export const postDesignChat: RequestHandler = async (req, res) => {
  const designId = asString(req.params.designId);
  const result = await designsService.chatDesign(req.user?.id, req.userRole, {
    message: req.body.message || req.body.text || req.body.prompt || "Refine this design",
    designId,
    history: req.body.history,
    generateImage: Boolean(req.body.generateImage),
  });
  success(res, result, "Design chat message processed", 201);
};

export const updateColors: RequestHandler = async (req, res) => {
  const colors = Array.isArray(req.body) ? req.body : req.body.colors ?? req.body.colorPalette;
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { colors });
  success(res, updated, "Design colors updated");
};

export const updateFabric: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { fabric: req.body.fabric ?? req.body });
  success(res, updated, "Design fabric updated");
};

export const updateEmbroidery: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { embroidery: req.body.embroidery ?? req.body });
  success(res, updated, "Design embroidery updated");
};

export const updateMeasurements: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { measurements: req.body.measurements ?? req.body });
  success(res, updated, "Design measurements updated");
};

export const updateNotes: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { notes: req.body.notes ?? req.body });
  success(res, updated, "Design notes updated");
};

export const getTechPack: RequestHandler = async (req, res) => {
  const designId = asString(req.params.designId);
  const result = await designsService.getTechPack(designId, req.user?.id, req.userRole);
  if (req.query.format === "pdf" || req.headers.accept === "application/pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="tech-pack-${designId}.pdf"`);
    return res.status(200).send(result.pdfBuffer);
  }
  const { pdfBuffer: _buf, ...jsonPayload } = result;
  success(res, jsonPayload, "Tech pack generated successfully");
};

export const exportPdf: RequestHandler = async (req, res) => {
  const pdf = await designsService.exportPdf(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, pdf, "PDF exported successfully", 201);
};

export const getDesignPdf: RequestHandler = async (req, res) => {
  const designId = asString(req.params.designId);
  const design = await designsService.getDesignById(designId, req.user?.id, req.userRole);
  let pdfUrl = (design as Record<string, unknown>)?.pdfUrl as string | null;
  if (!pdfUrl) {
    const generated = await designsService.exportPdf(designId, req.user?.id, req.userRole);
    pdfUrl = generated.pdfUrl;
  }
  success(res, { pdfUrl }, "PDF details fetched");
};

export const getExports: RequestHandler = async (req, res) => {
  const result = await designsService.getDesigns(req.user?.id, req.userRole, 1, 100);
  const exports = result.records.filter((r: any) => Boolean(r.pdf_url || r.pdfUrl));
  success(res, exports, "Exports list fetched successfully");
};
