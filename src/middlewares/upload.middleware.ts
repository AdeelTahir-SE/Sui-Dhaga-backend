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
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
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
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file format: ${file.mimetype}. Allowed formats: PDF, JPEG, PNG, WebP, DOC, DOCX, TXT`,
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
    limits: { fileSize: maxSizeBytes, files: 1 },
    fileFilter: documentFileFilter,
  }).single(fieldName);
