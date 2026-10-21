/**
 * TypeScript client for Sui Dhaga Python Measurement Service.
 * Provides Zod-validated request/response types, timeout, retries,
 * and error-code mapping to human-friendly messages.
 */

import { z } from "zod";
import { AppError } from "../utils/app-error.js";

// Zod schemas matching measurement-service API contract
export const MeasurementsCmSchema = z.object({
  height: z.number().positive(),
  chest: z.number().positive(),
  waist: z.number().positive(),
  hips: z.number().positive(),
  shoulder_width: z.number().positive(),
  sleeve_length: z.number().positive(),
  inseam: z.number().positive(),
  neck: z.number().positive(),
  thigh: z.number().positive(),
});

export const QualityResultSchema = z.object({
  passed: z.boolean(),
  warnings: z.array(z.string()).default([]),
});

export const ModelInfoSchema = z.object({
  shapy: z.string(),
  body_model: z.string(),
  pipeline_version: z.string(),
});

export const MeasureResponseSchema = z.object({
  measurements_cm: MeasurementsCmSchema,
  estimated_weight_kg: z.number().positive(),
  scale_factor: z.number().positive(),
  quality: QualityResultSchema,
  accuracy_note: z.string(),
  model_info: ModelInfoSchema,
});

export type MeasureResponse = z.infer<typeof MeasureResponseSchema>;
export type MeasurementsCm = z.infer<typeof MeasurementsCmSchema>;

export interface MeasurePhotoRequest {
  imageBuffer: Buffer;
  mimeType: string;
  gender: "male" | "female" | "neutral";
  heightCm: number;
  weightKg?: number;
}

// User-friendly error message map for machine-readable reason codes
const ERROR_CODE_MESSAGES: Record<string, string> = {
  NO_PERSON: "No person detected in the photo. Please ensure good lighting and contrast against the background.",
  MULTIPLE_PEOPLE: "Multiple people detected in the frame. Please take a photo with only yourself in view.",
  BODY_NOT_FULLY_VISIBLE: "Full body is not completely visible. Please step back so your entire body from head to feet is in frame.",
  IMAGE_TOO_SMALL: "Photo resolution is too low. Please upload an image of at least 512x512 pixels.",
  SCALE_IMPLAUSIBLE: "Calculated body scale is implausible for the entered height. Please verify your height and stand straight.",
  INVALID_IMAGE: "The uploaded file could not be decoded as a valid image.",
  MODEL_NOT_READY: "Measurement AI engine is initializing. Please try again in a few moments.",
  INFERENCE_TIMEOUT: "Measurement computation timed out. Please try again with a clearer photo.",
};

export class MeasurementServiceClient {
  private baseUrl: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(
    baseUrl: string = process.env.MEASUREMENT_SERVICE_URL || "http://localhost:8000",
    timeoutMs: number = 60000,
    maxRetries: number = 1
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  /**
   * Health check to query Python service status
   */
  async checkHealth(): Promise<{ status: string; models_loaded: boolean; device: string }> {
    const res = await fetch(`${this.baseUrl}/health`, { method: "GET" });
    if (!res.ok) {
      throw new AppError(`Measurement service health check failed with status ${res.status}`, 503);
    }
    return (await res.json()) as { status: string; models_loaded: boolean; device: string };
  }

  /**
   * Submits photo to measurement-service and returns validated measurement estimates
   */
  async measureFromPhoto(req: MeasurePhotoRequest): Promise<MeasureResponse> {
    const url = `${this.baseUrl}/v1/measure`;
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(req.imageBuffer)], { type: req.mimeType });
        formData.append("image", blob, "photo.jpg");
        formData.append("gender", req.gender);
        formData.append("height_cm", req.heightCm.toString());
        if (req.weightKg != null && req.weightKg > 0) {
          formData.append("weight_kg", req.weightKg.toString());
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          let errJson: any = null;
          try {
            errJson = await response.json();
          } catch {
            // response was not JSON
          }

          const errorCode = errJson?.code || errJson?.error || "INFERENCE_ERROR";
          const rawMessage = errJson?.message || errJson?.detail || "Measurement failed";
          const friendlyMessage = ERROR_CODE_MESSAGES[errorCode] || rawMessage;

          // If retryable server error (503) and attempts left
          if (response.status === 503 && attempt <= this.maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            continue;
          }

          throw new AppError(friendlyMessage, response.status === 422 ? 422 : 400);
        }

        const rawData = await response.json();
        const parseResult = MeasureResponseSchema.safeParse(rawData);
        if (!parseResult.success) {
          console.error("Measurement schema validation error:", parseResult.error);
          throw new AppError("Invalid measurement response schema received from AI service", 502);
        }

        return parseResult.data;
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        if (err.name === "AbortError") {
          throw new AppError("Measurement service timed out while processing photo", 504);
        }
        if (attempt <= this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          continue;
        }
        throw new AppError(`Failed to connect to measurement service: ${err.message}`, 502);
      }
    }

    throw new AppError("Measurement service unavailable after retries", 503);
  }
}

export const measurementServiceClient = new MeasurementServiceClient();
