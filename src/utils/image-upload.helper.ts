import { AppError } from "./app-error.js";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
};

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export const SUPPORTED_IMAGE_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);

export function inferImageMimeFromFilename(filename?: string): string | null {
  if (!filename) return null;
  const cleanName = filename.split("?")[0].trim().toLowerCase();
  const ext = cleanName.includes(".") ? cleanName.split(".").pop() || "" : "";
  return MIME_BY_EXTENSION[ext] || null;
}

export function isSupportedImageFile(mimetype?: string, originalname?: string): boolean {
  const normalizedMime = (mimetype || "").split(";")[0].trim().toLowerCase();
  if (normalizedMime.startsWith("image/")) {
    return true;
  }
  if (!normalizedMime || normalizedMime === "application/octet-stream") {
    return Boolean(inferImageMimeFromFilename(originalname));
  }
  return false;
}

export function resolveImageFileMeta(file: Express.Multer.File): {
  extension: string;
  mimeType: string;
} {
  if (!file?.buffer || file.buffer.length === 0) {
    throw new AppError("Uploaded image file is empty", 400);
  }

  let mimeType = (file.mimetype || "").split(";")[0].trim().toLowerCase();
  if (mimeType === "image/jpg") mimeType = "image/jpeg";

  if (!mimeType || mimeType === "application/octet-stream" || !mimeType.startsWith("image/")) {
    mimeType = inferImageMimeFromFilename(file.originalname) || "image/png";
  }

  const rawExt = file.originalname?.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const mappedExt = EXTENSION_BY_MIME[mimeType];
  const extension = mappedExt || (rawExt && MIME_BY_EXTENSION[rawExt] ? rawExt : "png");

  return { extension, mimeType };
}

export function parseBase64ImageDataUri(
  raw: string,
  maxBytes: number = MAX_AVATAR_BYTES
): { buffer: Buffer; mimeType: string; extension: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.toLowerCase().startsWith("data:")) {
    return null;
  }

  const match = trimmed.match(/^data:(image\/[a-z0-9.+-]+)(?:;[^,;]+)*;base64,([A-Za-z0-9+/=\s]+)$/i);
  if (!match) {
    throw new AppError(
      "Invalid image data URI. Expected a base64-encoded image (JPEG, PNG, WebP, GIF, SVG, AVIF, or HEIC).",
      400
    );
  }

  let mimeType = match[1].toLowerCase();
  if (mimeType === "image/jpg") mimeType = "image/jpeg";

  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new AppError(
      `Unsupported image format: ${mimeType}. Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF, HEIC`,
      400
    );
  }

  const cleanBase64 = match[2].replace(/\s+/g, "");
  const buffer = Buffer.from(cleanBase64, "base64");
  if (!buffer.length) {
    throw new AppError("Decoded image payload is empty", 400);
  }

  if (buffer.length > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new AppError(`File size exceeds the allowed limit (max ${limitMb}MB)`, 400);
  }

  return { buffer, mimeType, extension };
}

export function decodeRawBase64Image(
  rawBase64: string,
  mimeTypeHint?: string,
  maxBytes: number = MAX_AVATAR_BYTES
): { buffer: Buffer; mimeType: string; extension: string } {
  const dataUriParsed = parseBase64ImageDataUri(rawBase64, maxBytes);
  if (dataUriParsed) return dataUriParsed;

  let mimeType = (mimeTypeHint || "image/png").split(";")[0].trim().toLowerCase();
  if (mimeType === "image/jpg") mimeType = "image/jpeg";
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) {
    throw new AppError(
      `Unsupported image MIME type: ${mimeType}. Allowed formats: JPEG, PNG, WebP, GIF, SVG, AVIF, HEIC`,
      400
    );
  }

  const cleanBase64 = rawBase64.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
    throw new AppError("Invalid base64 image payload", 400);
  }

  const buffer = Buffer.from(cleanBase64, "base64");
  if (!buffer.length) {
    throw new AppError("Decoded image payload is empty", 400);
  }
  if (buffer.length > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new AppError(`File size exceeds the allowed limit (max ${limitMb}MB)`, 400);
  }

  return { buffer, mimeType, extension };
}

export function isValidHttpImageUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function extractStoragePathFromUrl(
  url: unknown,
  bucket: string,
  requiredPrefix?: string
): string | null {
  if (typeof url !== "string" || !url.trim() || url.trim().startsWith("data:")) {
    return null;
  }

  try {
    const parsed = new URL(url.trim());
    const pathname = parsed.pathname;
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/object/authenticated/${bucket}/`,
      `/api/v1/media/${bucket}/`,
    ];

    for (const marker of markers) {
      const idx = pathname.indexOf(marker);
      if (idx !== -1) {
        const objectPath = decodeURIComponent(pathname.slice(idx + marker.length)).replace(/^\/+/, "");
        if (!objectPath || objectPath.includes("..")) return null;
        if (requiredPrefix && !objectPath.startsWith(requiredPrefix)) return null;
        return objectPath;
      }
    }
  } catch {
    return null;
  }

  return null;
}
