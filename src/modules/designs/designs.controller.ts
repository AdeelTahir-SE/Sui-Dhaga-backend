import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { designsService } from "./designs.service.js";

export const getDesigns: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await designsService.getDesigns(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Designs fetched successfully");
};

export const getDesignById: RequestHandler = async (req, res) => {
  const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, design, "Design fetched successfully");
};

export const textToDesign: RequestHandler = async (req, res) => {
  const result = await designsService.textToDesign(req.user?.id, req.userRole, req.body.prompt);
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
  const result = await designsService.createDesign(req.user?.id, req.userRole, req.body);
  success(res, result, "Design chat processed successfully", 201);
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
  success(res, design ? (design as Record<string, unknown>).chatHistory ?? [] : [], "Design chat history fetched");
};

export const postDesignChat: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { lastChatMessage: req.body });
  success(res, updated, "Design chat message sent", 201);
};

export const updateColors: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { colors: req.body });
  success(res, updated, "Design colors updated");
};

export const updateFabric: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { fabric: req.body });
  success(res, updated, "Design fabric updated");
};

export const updateEmbroidery: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { embroidery: req.body });
  success(res, updated, "Design embroidery updated");
};

export const updateMeasurements: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { measurements: req.body });
  success(res, updated, "Design measurements updated");
};

export const updateNotes: RequestHandler = async (req, res) => {
  const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { notes: req.body });
  success(res, updated, "Design notes updated");
};

export const exportPdf: RequestHandler = async (req, res) => {
  const pdf = await designsService.exportPdf(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, pdf, "PDF exported successfully", 201);
};

export const getDesignPdf: RequestHandler = async (req, res) => {
  const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
  success(res, { pdfUrl: (design as Record<string, unknown>)?.pdfUrl ?? null }, "PDF details fetched");
};

export const getExports: RequestHandler = async (req, res) => {
  const result = await designsService.getDesigns(req.user?.id, req.userRole, 1, 100);
  const exports = result.records.filter((r) => Boolean(r.pdf_url || r.pdfUrl));
  success(res, exports, "Exports list fetched successfully");
};


