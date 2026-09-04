import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { apiRoutes } from "./routes/index.js";

export const app = express();

// Middleware
app.use((helmet as any)());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Health Check
app.get("/health", (_req, res) => 
  res.status(200).json({ success: true, message: "Service healthy", data: { status: "ok" } })
);

// Swagger Documentation Route
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Sui Dhaga API",
      version: "1.0.0",
      description: "API documentation for Sui Dhaga",
    },
  },
  apis: [
    "./src/routes/*.ts",
    "./src/modules/**/*.ts",
    "./dist/routes/*.js",
    "./dist/modules/**/*.js"
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCssUrl: "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css",
    customJs: [
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js",
      "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js"
    ]
  })
);

// API Routes
app.use("/api/v1", apiRoutes);

// Fallback Handlers
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);
