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
app.use(
  (helmet as any)({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://vercel.live"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://validator.swagger.io",
          "https://vercel.com",
          "https://vercel.live"
        ],
        connectSrc: [
          "'self'",
          "https://vercel.live",
          "https://*.supabase.co"
        ]
      }
    }
  })
);
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
      description: "Comprehensive REST API documentation for Sui Dhaga Custom Tailoring & AI Design Platform",
      contact: {
        name: "Sui Dhaga Support",
        email: "support@suidhaga.com",
      },
    },
    servers: [
      {
        url: "/api/v1",
        description: "API Version 1",
      },
      {
        url: "http://localhost:5000/api/v1",
        description: "Local Development Server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter Supabase JWT token without 'Bearer ' prefix",
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication and session management" },
      { name: "Users", description: "User profile management" },
      { name: "Tailors", description: "Tailor profiles, verification, services, and availability" },
      { name: "Appointments", description: "Tailor booking appointments" },
      { name: "Orders", description: "Custom tailoring orders and tracking" },
      { name: "Conversations", description: "Direct chat messaging and attachments" },
      { name: "Designs", description: "AI design generation and studio customizations" },
      { name: "Measurements", description: "Customer body measurement profiles" },
      { name: "Fabrics", description: "Fabric catalog and pricing" },
      { name: "Reviews", description: "Tailor and order reviews & ratings" },
      { name: "Wishlist", description: "Saved designs and tailor bookmarks" },
      { name: "Payments", description: "Checkout sessions, payments, and webhooks" },
      { name: "Notifications", description: "User alerts and notifications" },
      { name: "Uploads", description: "Media and document file uploads" },
      { name: "Admin", description: "Administrative analytics, moderation, and management" },
    ],
  },
  apis: [
    "./src/routes/*.ts",
    "./src/modules/**/*.routes.ts",
    "./src/modules/**/*.ts",
    "./dist/routes/*.js",
    "./dist/modules/**/*.routes.js",
    "./dist/modules/**/*.js",
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);


app.get("/api-docs/swagger.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

app.get("/api-docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sui Dhaga API Documentation</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`);
});

// API Routes
app.use("/api/v1", apiRoutes);

// Fallback Handlers
app.use((_req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);
