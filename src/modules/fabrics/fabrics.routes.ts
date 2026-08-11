import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requireRole } from "../../middlewares/role.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as fabricsController from "./fabrics.controller.js";
import { createFabricSchema, updateFabricSchema } from "./fabrics.validator.js";

export const fabricsRoutes = Router();

fabricsRoutes.get("/fabrics", asyncHandler(fabricsController.getFabrics));
fabricsRoutes.post("/fabrics", requireAuth, requireRole("tailor", "admin"), validate(createFabricSchema), asyncHandler(fabricsController.createFabric));
fabricsRoutes.get("/fabrics/:fabricId", asyncHandler(fabricsController.getFabricById));
fabricsRoutes.patch("/fabrics/:fabricId", requireAuth, requireRole("tailor", "admin"), validate(updateFabricSchema), asyncHandler(fabricsController.updateFabric));
fabricsRoutes.delete("/fabrics/:fabricId", requireAuth, requireRole("tailor", "admin"), asyncHandler(fabricsController.deleteFabric));
