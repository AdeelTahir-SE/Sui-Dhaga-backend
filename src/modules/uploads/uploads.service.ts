import { storageService, type StorageBucket } from "../../services/storage.service.js";
import { AppError } from "../../utils/app-error.js";
import {
  isValidHttpImageUrl,
  MAX_IMAGE_BYTES,
  parseBase64ImageDataUri,
  resolveImageFileMeta,
} from "../../utils/image-upload.helper.js";

const PUBLIC_IMAGE_BUCKETS = new Set<StorageBucket>([
  "avatars",
  "designs",
  "tailor-gallery",
  "tailor-banners",
  "community-posts",
  "message-attachments",
  "references",
  "order-designs",
]);

function resolveImageBucket(data: Record<string, unknown>): StorageBucket {
  const requestedBucket = typeof data.bucket === "string" ? (data.bucket.trim() as StorageBucket) : undefined;
  if (requestedBucket && PUBLIC_IMAGE_BUCKETS.has(requestedBucket)) {
    return requestedBucket;
  }
  const folder = typeof data.folder === "string" ? data.folder.trim().toLowerCase() : "";
  if (folder === "avatars") return "avatars";
  if (folder === "order-designs") return "order-designs";
  return "references";
}

export const uploadsService = {
  async uploadImage(userId: string | undefined, _userRole: string | undefined, file?: Express.Multer.File, data: Record<string, unknown> = {}) {
    const folder = (typeof data.folder === "string" && data.folder.trim()) || "general";
    const bucket = resolveImageBucket(data);

    if (file) {
      const { extension, mimeType } = resolveImageFileMeta(file);
      const path = `${folder}/${userId || "public"}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

      const { url } = await storageService.uploadFile(bucket, path, file.buffer, mimeType);

      return {
        fileId: path,
        userId,
        mediaType: "image",
        mimeType,
        size: file.size,
        originalName: file.originalname,
        url,
        uploadedAt: new Date().toISOString(),
      };
    }

    const rawCandidate = (data.url || data.imageUrl || data.image || data.avatarUrl || data.avatar) as string | undefined;
    if (!rawCandidate || typeof rawCandidate !== "string" || !rawCandidate.trim()) {
      throw new AppError("Image file, base64 data URI, or URL is required", 400);
    }

    const parsedDataUri = parseBase64ImageDataUri(rawCandidate, MAX_IMAGE_BYTES);
    if (parsedDataUri) {
      const path = `${folder}/${userId || "public"}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${parsedDataUri.extension}`;
      const { url } = await storageService.uploadFile(bucket, path, parsedDataUri.buffer, parsedDataUri.mimeType);
      return {
        fileId: path,
        userId,
        mediaType: "image",
        mimeType: parsedDataUri.mimeType,
        size: parsedDataUri.buffer.length,
        url,
        uploadedAt: new Date().toISOString(),
      };
    }

    if (!isValidHttpImageUrl(rawCandidate)) {
      throw new AppError("Invalid image URL or data URI", 400);
    }

    return {
      fileId: `img-${Date.now()}`,
      userId,
      mediaType: "image",
      url: rawCandidate.trim(),
      uploadedAt: new Date().toISOString(),
      ...data,
    };
  },

  async uploadImages(userId: string | undefined, _userRole: string | undefined, files?: Express.Multer.File[], data: Record<string, unknown> = {}) {
    if (files && files.length > 0) {
      const folder = (data.folder as string) || "general";
      const bucket = ((data.bucket as string) || (folder === "order-designs" ? "order-designs" : "references")) as import("../../services/storage.service.js").StorageBucket;
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.originalname?.split(".").pop() || "png";
        const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
        const path = `${folder}/${userId || "public"}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "png"}`;
        const { url } = await storageService.uploadFile(bucket, path, file.buffer, file.mimetype);
        return {
          fileId: path,
          url,
          mimeType: file.mimetype,
          size: file.size,
          originalName: file.originalname,
        };
      });

      const uploaded = await Promise.all(uploadPromises);
      return {
        batchId: `batch-${Date.now()}`,
        userId,
        mediaType: "images_batch",
        count: uploaded.length,
        items: uploaded,
        urls: uploaded.map((u) => u.url),
        uploadedAt: new Date().toISOString(),
      };
    }

    const rawUrls = (data.urls || data.images) as string[];
    const urls = Array.isArray(rawUrls) ? rawUrls : [];
    if (urls.length === 0) {
      throw new AppError("At least one image file or URL is required", 400);
    }

    return {
      batchId: `batch-${Date.now()}`,
      userId,
      mediaType: "images_batch",
      urls,
      count: urls.length,
      uploadedAt: new Date().toISOString(),
    };
  },

  async uploadFile(userId: string | undefined, _userRole: string | undefined, file?: Express.Multer.File, data: Record<string, unknown> = {}) {
    if (file) {
      const folder = (data.folder as string) || "documents";
      const fileExt = file.originalname?.split(".").pop() || "pdf";
      const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
      const path = `${folder}/${userId || "public"}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "pdf"}`;

      const { url } = await storageService.uploadFile("references", path, file.buffer, file.mimetype);

      return {
        fileId: path,
        userId,
        mediaType: "file",
        mimeType: file.mimetype,
        size: file.size,
        fileName: file.originalname,
        url,
        uploadedAt: new Date().toISOString(),
      };
    }

    const fallbackUrl = (data.url || data.fileUrl || data.file) as string;
    if (!fallbackUrl) {
      throw new AppError("File or URL is required", 400);
    }

    return {
      fileId: `file-${Date.now()}`,
      userId,
      mediaType: "file",
      url: fallbackUrl,
      fileName: (data.fileName as string) || "document.pdf",
      uploadedAt: new Date().toISOString(),
      ...data,
    };
  },

  async deleteUpload(fileId: string, _userId: string | undefined, _userRole: string | undefined) {
    if (fileId && !fileId.startsWith("img-") && !fileId.startsWith("file-")) {
      await storageService.deleteFile("references", fileId);
    }
    return true;
  },
};
