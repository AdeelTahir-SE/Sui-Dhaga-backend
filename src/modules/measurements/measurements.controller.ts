import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { measurementsService } from "./measurements.service.js";
import { measurementServiceClient } from "../../services/measurement-service.client.js";

const round1 = (n: number) => Math.round(n * 10) / 10;

export const getMeasurements: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const targetUserId = req.userRole === "admin" && req.query.userId ? String(req.query.userId) : req.user?.id;
  const result = await measurementsService.getMeasurements(targetUserId, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Measurements fetched successfully");
};

export const createMeasurement: RequestHandler = async (req, res) => {
  let fileBuffer = req.file?.buffer;
  let mimeType = req.file?.mimetype || "image/jpeg";

  // Fallback if base64 encoded photo was sent in JSON payload
  if (!fileBuffer && typeof req.body.imageBase64 === "string" && req.body.imageBase64.length > 0) {
    const rawB64 = req.body.imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    fileBuffer = Buffer.from(rawB64, "base64");
  }

  let aiEstimation: any = undefined;

  // If photo was provided, trigger SHAPY virtual measurements
  if (fileBuffer) {
    const heightVal = Number(req.body.heightCm || req.body.height);
    if (!heightVal || heightVal <= 0) {
      throw new AppError("heightCm is required for photo body measurement", 400);
    }

    const genderVal = ((req.body.gender || "neutral") as string).toLowerCase() as "male" | "female" | "neutral";
    const weightVal = req.body.weightKg ? Number(req.body.weightKg) : undefined;

    const aiRes = await measurementServiceClient.measureFromPhoto({
      imageBuffer: fileBuffer,
      mimeType,
      gender: genderVal,
      heightCm: heightVal,
      weightKg: weightVal,
    });

    aiEstimation = aiRes;

    const unit = req.body.unit === "cm" ? "cm" : "in";
    const convert = (cm: number) => (unit === "cm" ? round1(cm) : round1(cm / 2.54));

    // Pre-fill profile measurements if not manually overridden
    req.body.chest = req.body.chest ?? convert(aiRes.measurements_cm.chest);
    req.body.waist = req.body.waist ?? convert(aiRes.measurements_cm.waist);
    req.body.hips = req.body.hips ?? convert(aiRes.measurements_cm.hips);
    req.body.shoulder = req.body.shoulder ?? convert(aiRes.measurements_cm.shoulder_width);
    req.body.sleeveLength = req.body.sleeveLength ?? convert(aiRes.measurements_cm.sleeve_length);
    req.body.inseam = req.body.inseam ?? convert(aiRes.measurements_cm.inseam);
    req.body.neck = req.body.neck ?? convert(aiRes.measurements_cm.neck);
    req.body.gender = req.body.gender || genderVal;

    const aiNote = `Estimated from photo via SHAPY (pending tailor confirmation) [Scale: ${aiRes.scale_factor}]`;
    req.body.notes = req.body.notes ? `${req.body.notes} | ${aiNote}` : aiNote;
    req.body.title = req.body.title || "AI Photo Measurement";
  }

  const created = await measurementsService.createMeasurement(req.user?.id, req.userRole, req.body);
  success(res, { ...created, aiEstimation }, "Measurement profile created successfully", 201);
};


export const getMeasurementById: RequestHandler = async (req, res) => {
  const measurement = await measurementsService.getMeasurementById(asString(req.params.measurementId), req.user?.id, req.userRole);
  success(res, measurement, "Measurement fetched successfully");
};

export const updateMeasurement: RequestHandler = async (req, res) => {
  const updated = await measurementsService.updateMeasurement(asString(req.params.measurementId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Measurement updated successfully");
};

export const deleteMeasurement: RequestHandler = async (req, res) => {
  await measurementsService.deleteMeasurement(asString(req.params.measurementId), req.user?.id, req.userRole);
  success(res, null, "Measurement deleted successfully");
};
