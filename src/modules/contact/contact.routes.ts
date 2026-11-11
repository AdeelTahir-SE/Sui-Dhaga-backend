import { Router } from "express";
import { optionalAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as contactController from "./contact.controller.js";
import { contactMessageSchema } from "./contact.validator.js";

export const contactRoutes = Router();

/**
 * @openapi
 * /contact:
 *   post:
 *     summary: Submit a contact or support inquiry
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *               category: { type: string, example: "general" }
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       201:
 *         description: Inquiry submitted successfully
 */
contactRoutes.post(
  "/contact",
  optionalAuth,
  validate(contactMessageSchema),
  asyncHandler(contactController.submitContact)
);
