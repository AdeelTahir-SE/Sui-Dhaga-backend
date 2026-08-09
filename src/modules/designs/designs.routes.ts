import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { designsService } from "./designs.service.js";

export const designsRoutes = Router();

const designAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

designsRoutes.get(
  "/designs",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await designsService.getDesigns(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Designs fetched successfully");
  }),
);

designsRoutes.get(
  "/designs/:designId",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, design, "Design fetched successfully");
  }),
);

designsRoutes.post(
  "/designs/text-to-design",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const result = await designsService.textToDesign(req.user?.id, req.userRole, req.body.prompt as string);
    success(res, result, "Text to design generated successfully", 201);
  }),
);

designsRoutes.post(
  "/designs/image-to-design",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const result = await designsService.imageToDesign(req.user?.id, req.userRole, req.body.imageUrl as string);
    success(res, result, "Image to design generated successfully", 201);
  }),
);

designsRoutes.post(
  "/designs/sketch-to-design",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const result = await designsService.sketchToDesign(req.user?.id, req.userRole, req.body.sketchUrl as string);
    success(res, result, "Sketch to design generated successfully", 201);
  }),
);

designsRoutes.post(
  "/designs/chat",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const result = await designsService.createDesign(req.user?.id, req.userRole, req.body);
    success(res, result, "Design chat processed successfully", 201);
  }),
);

designsRoutes.patch(
  "/designs/:designId",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Design updated successfully");
  }),
);

designsRoutes.delete(
  "/designs/:designId",
  ...designAuth,
  asyncHandler(async (req, res) => {
    await designsService.deleteDesign(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, null, "Design deleted successfully");
  }),
);

designsRoutes.post(
  "/designs/:designId/duplicate",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const duplicated = await designsService.duplicateDesign(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, duplicated, "Design duplicated successfully", 201);
  }),
);

designsRoutes.post(
  "/designs/:designId/share-with-tailor",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const shared = await designsService.shareWithTailor(asString(req.params.designId), req.user?.id, req.userRole, req.body.tailorId as string);
    success(res, shared, "Design shared with tailor successfully");
  }),
);

designsRoutes.get(
  "/designs/:designId/chat",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, design ? (design as Record<string, unknown>).chatHistory ?? [] : [], "Design chat history fetched");
  }),
);

designsRoutes.post(
  "/designs/:designId/chat",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { lastChatMessage: req.body });
    success(res, updated, "Design chat message sent", 201);
  }),
);

designsRoutes.patch(
  "/designs/:designId/colors",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { colors: req.body });
    success(res, updated, "Design colors updated");
  }),
);

designsRoutes.patch(
  "/designs/:designId/fabric",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { fabric: req.body });
    success(res, updated, "Design fabric updated");
  }),
);

designsRoutes.patch(
  "/designs/:designId/embroidery",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { embroidery: req.body });
    success(res, updated, "Design embroidery updated");
  }),
);

designsRoutes.patch(
  "/designs/:designId/measurements",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { measurements: req.body });
    success(res, updated, "Design measurements updated");
  }),
);

designsRoutes.patch(
  "/designs/:designId/notes",
  ...designAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await designsService.updateDesign(asString(req.params.designId), req.user?.id, req.userRole, { notes: req.body });
    success(res, updated, "Design notes updated");
  }),
);

designsRoutes.post(
  "/designs/:designId/export-pdf",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const pdf = await designsService.exportPdf(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, pdf, "PDF exported successfully", 201);
  }),
);

designsRoutes.get(
  "/designs/:designId/pdf",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const design = await designsService.getDesignById(asString(req.params.designId), req.user?.id, req.userRole);
    success(res, { pdfUrl: (design as Record<string, unknown>)?.pdfUrl ?? null }, "PDF details fetched");
  }),
);

designsRoutes.get(
  "/exports",
  ...designAuth,
  asyncHandler(async (req, res) => {
    const result = await designsService.getDesigns(req.user?.id, req.userRole, 1, 100);
    const exports = result.records.filter((r: Record<string, unknown>) => r.pdfUrl);
    success(res, exports, "Exports list fetched successfully");
  }),
);
