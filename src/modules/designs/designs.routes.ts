import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as designsController from "./designs.controller.js";
import {
  textToDesignSchema,
  imageToDesignSchema,
  sketchToDesignSchema,
  designChatSchema,
  updateDesignSchema,
  shareDesignSchema,
} from "./designs.validator.js";

export const designsRoutes = Router();

const designAuth = [requireAuth, requireRole("customer", "tailor", "admin")];

designsRoutes.get("/designs", ...designAuth, asyncHandler(designsController.getDesigns));
designsRoutes.get("/designs/:designId", ...designAuth, asyncHandler(designsController.getDesignById));

designsRoutes.post("/designs/text-to-design", ...designAuth, validate(textToDesignSchema), asyncHandler(designsController.textToDesign));
designsRoutes.post("/designs/image-to-design", ...designAuth, validate(imageToDesignSchema), asyncHandler(designsController.imageToDesign));
designsRoutes.post("/designs/sketch-to-design", ...designAuth, validate(sketchToDesignSchema), asyncHandler(designsController.sketchToDesign));
designsRoutes.post("/designs/chat", ...designAuth, validate(designChatSchema), asyncHandler(designsController.designChat));

designsRoutes.patch("/designs/:designId", ...designAuth, validate(updateDesignSchema), asyncHandler(designsController.updateDesign));
designsRoutes.delete("/designs/:designId", ...designAuth, asyncHandler(designsController.deleteDesign));
designsRoutes.post("/designs/:designId/duplicate", ...designAuth, asyncHandler(designsController.duplicateDesign));
designsRoutes.post("/designs/:designId/share-with-tailor", ...designAuth, validate(shareDesignSchema), asyncHandler(designsController.shareWithTailor));

designsRoutes.get("/designs/:designId/chat", ...designAuth, asyncHandler(designsController.getDesignChat));
designsRoutes.post("/designs/:designId/chat", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.postDesignChat));

designsRoutes.patch("/designs/:designId/colors", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateColors));
designsRoutes.patch("/designs/:designId/fabric", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateFabric));
designsRoutes.patch("/designs/:designId/embroidery", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateEmbroidery));
designsRoutes.patch("/designs/:designId/measurements", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateMeasurements));
designsRoutes.patch("/designs/:designId/notes", ...designAuth, validate(z.record(z.unknown())), asyncHandler(designsController.updateNotes));

designsRoutes.post("/designs/:designId/export-pdf", ...designAuth, asyncHandler(designsController.exportPdf));
designsRoutes.get("/designs/:designId/pdf", ...designAuth, asyncHandler(designsController.getDesignPdf));
designsRoutes.get("/exports", ...designAuth, asyncHandler(designsController.getExports));
