import type { CorsOptions } from "cors";
import { env } from "./env.js";

export const corsOptions: CorsOptions = {
  origin: env.CLIENT_ORIGINS.split(",").map((origin) => origin.trim()),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
