import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { uploadsService } from "./uploads.service.js";

export const uploadImage: RequestHandler = async (req, res) => {
  const result = await uploadsService.uploadImage(req.user?.id, req.userRole, req.file, req.body);
  success(res, result, "Image uploaded successfully", 201);
};

export const uploadImages: RequestHandler = async (req, res) => {
  const files = req.files as Express.Multer.File[] | undefined;
  const result = await uploadsService.uploadImages(req.user?.id, req.userRole, files, req.body);
  success(res, result, "Images uploaded successfully", 201);
};

export const uploadFile: RequestHandler = async (req, res) => {
  const result = await uploadsService.uploadFile(req.user?.id, req.userRole, req.file, req.body);
  success(res, result, "File uploaded successfully", 201);
};

export const deleteFile: RequestHandler = async (req, res) => {
  await uploadsService.deleteUpload(asString(req.params.fileId), req.user?.id, req.userRole);
  success(res, null, "File deleted successfully");
};
