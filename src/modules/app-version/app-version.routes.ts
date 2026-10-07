import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler.js";
import * as appVersionController from "./app-version.controller.js";

export const appVersionRoutes = Router();

/**
 * @openapi
 * /app-version/latest:
 *   get:
 *     summary: Check latest app version and determine if mandatory/optional update is needed
 *     tags: [AppVersion]
 *     parameters:
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           default: android
 *         description: Client platform (android, ios)
 *       - in: query
 *         name: clientVersion
 *         schema:
 *           type: string
 *         description: Current installed version (e.g. 1.0.0)
 *     responses:
 *       200:
 *         description: Latest version info returned successfully
 */
appVersionRoutes.get("/app-version/latest", asyncHandler(appVersionController.getLatestVersion));
