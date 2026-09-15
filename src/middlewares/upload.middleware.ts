import multer from "multer";
import { AppError } from "../utils/app-error.js";

// Memory storage to keep uploaded files in buffer for Supabase Storage uploads
const storage = multer.memoryStorage();

// Allowed MIME types
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export const ALLOWED_DOCUMENT_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",

  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/heic",
  "image/heif",

  // Voice & Audio
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/3gpp",
  "audio/3gp",
  "audio/amr",
  "audio/x-caf",
  "audio/caf",
  "audio/flac",
  "audio/opus",
  "application/octet-stream",
];

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  if (ALLOWED_IMAGE_TYPES.includes(mime) || mime.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid image format: ${file.mimetype}. Allowed formats: JPEG, PNG, WebP, GIF, SVG`,
        400
      )
    );
  }
};

const documentFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mime = (file.mimetype || "").toLowerCase();
  const name = (file.originalname || "").toLowerCase();

  if (
    ALLOWED_DOCUMENT_TYPES.includes(mime) ||
    mime.startsWith("image/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("video/") ||
    mime === "application/octet-stream" ||
    name.endsWith(".m4a") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".aac") ||
    name.endsWith(".ogg") ||
    name.endsWith(".webm") ||
    name.endsWith(".caf") ||
    name.endsWith(".3gp") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt")
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file format: ${file.mimetype}. Allowed formats: Images, Audio / Voice notes, PDF, DOC, DOCX`,
        400
      )
    );
  }
};

// Preset: User Profile Avatar (max 5MB)
export const uploadAvatar = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: imageFileFilter,
});

// Single image upload helper
export const uploadSingleImage = (fieldName: string = "image", maxSizeBytes = 10 * 1024 * 1024) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes, files: 1 },
    fileFilter: imageFileFilter,
  }).single(fieldName);

// Multiple image upload helper
export const uploadMultipleImages = (fieldName: string = "images", maxCount = 10, maxSizeBytes = 10 * 1024 * 1024) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes, files: maxCount },
    fileFilter: imageFileFilter,
  }).array(fieldName, maxCount);

// Single document upload helper
export const uploadDocument = (fieldName: string = "file", maxSizeBytes = 15 * 1024 * 1024) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes, files: 1 },
    fileFilter: documentFileFilter,
  }).single(fieldName);

// Multiple document upload helper
export const uploadDocuments = (fieldName: string = "files", maxCount = 5, maxSizeBytes = 15 * 1024 * 1024) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes, files: maxCount },
    fileFilter: documentFileFilter,
  }).array(fieldName, maxCount);

// General media upload helper (Images & Documents)
export const uploadAnyMedia = (fieldName: string = "file", maxSizeBytes = 15 * 1024 * 1024) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes, files: 10 },
    fileFilter: documentFileFilter,
  }).single(fieldName);

// Chat & Voice Message media upload helper (supports multiple files under any field name)
export const uploadChatMedia = (maxCount = 10, maxSizeBytes = 25 * 1024 * 1024) =>
  multer({
    storage,
    limits: { fileSize: maxSizeBytes, files: maxCount },
    fileFilter: documentFileFilter,
  }).any();
