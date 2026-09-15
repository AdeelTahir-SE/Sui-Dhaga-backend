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

export const streamMedia: RequestHandler = async (req, res) => {
  const bucket = asString(req.params.bucket);
  const rawPath = req.params[0] || (req.params as any)["0"] || "";
  const cleanPath = decodeURIComponent(rawPath).replace(/^\/+/, "");

  const { supabase } = await import("../../config/supabase.js");
  if (!supabase) {
    return res.status(404).send("Storage service unavailable");
  }

  const { data, error } = await supabase.storage.from(bucket).download(cleanPath);
  if (error || !data) {
    return res.status(404).send("File not found");
  }

  const arrayBuf = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const cleanExt = cleanPath.split(".").pop()?.toLowerCase() || "";
  let mimeType = data.type;
  if (!mimeType || mimeType === "application/octet-stream") {
    if (cleanExt === "m4a") mimeType = "audio/m4a";
    else if (cleanExt === "mp3") mimeType = "audio/mpeg";
    else if (cleanExt === "wav") mimeType = "audio/wav";
    else if (cleanExt === "aac") mimeType = "audio/aac";
    else if (cleanExt === "png") mimeType = "image/png";
    else if (cleanExt === "jpg" || cleanExt === "jpeg") mimeType = "image/jpeg";
    else if (cleanExt === "webp") mimeType = "image/webp";
    else mimeType = "application/octet-stream";
  }

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");

  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.length - 1;
    const chunksize = end - start + 1;
    const chunk = buffer.subarray(start, end + 1);

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${buffer.length}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize.toString(),
      "Content-Type": mimeType,
    });
    res.end(chunk);
    return;
  }

  res.setHeader("Content-Length", buffer.length.toString());
  res.send(buffer);
};
