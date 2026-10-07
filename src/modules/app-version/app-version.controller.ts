import type { Request, Response } from "express";
import { appVersionService } from "./app-version.service.js";

export async function getLatestVersion(req: Request, res: Response) {
  const platform = typeof req.query.platform === "string" ? req.query.platform : "android";
  const clientVersion = typeof req.query.clientVersion === "string" ? req.query.clientVersion : undefined;

  const versionData = await appVersionService.getLatestVersion(platform, clientVersion);

  res.status(200).json({
    success: true,
    data: versionData,
  });
}
