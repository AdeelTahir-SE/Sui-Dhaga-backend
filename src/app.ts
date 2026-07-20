import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGINS.split(","), credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.get("/health", (_req, res) => res.status(200).json({ success: true, message: "Service healthy", data: { status: "ok" } }));
app.use("/api/v1", apiRoutes);
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);
