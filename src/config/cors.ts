import type { CorsOptions } from "cors";
import { env } from "./env.js";

export const DEFAULT_ALLOWED_ORIGINS = [
  "https://sui-dhaga-website.vercel.app",
  "http://localhost:3000",
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

function parseOrigins(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map(normalizeOrigin)
    // Wildcards are forbidden when credentials: true is enabled.
    .filter((origin) => origin.length > 0 && origin !== "*");
}

export function getAllowedOrigins(): string[] {
  const rawAllowed = process.env.ALLOWED_ORIGINS?.trim();
  if (rawAllowed) {
    const parsed = parseOrigins(rawAllowed);
    return Array.from(new Set(parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS));
  }

  const rawClient = process.env.CLIENT_ORIGINS ?? env.CLIENT_ORIGINS;
  return Array.from(new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseOrigins(rawClient)]));
}

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    const allowedOrigins = getAllowedOrigins();
    const isAllowed = allowedOrigins.includes(normalizeOrigin(origin));
    return callback(null, isAllowed);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 204,
};
