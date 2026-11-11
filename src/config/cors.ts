import type { CorsOptions } from "cors";
import { env } from "./env.js";

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const configuredOrigins = env.CLIENT_ORIGINS.split(",").map((o) => o.trim());
    if (configuredOrigins.includes(origin)) return callback(null, true);

    // In development or if localhost / 127.0.0.1, permit any port
    if (
      env.NODE_ENV !== "production" ||
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
