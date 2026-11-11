import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as addressesController from "./addresses.controller.js";
import { createAddressSchema, updateAddressSchema } from "./addresses.validator.js";

export const addressesRoutes = Router();

/**
 * @openapi
 * /addresses:
 *   get:
 *     summary: List saved shipping addresses for authenticated user
 *     tags: [Addresses]
 *     security: [{ BearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Saved addresses list
 *   post:
 *     summary: Create a new shipping address
 *     tags: [Addresses]
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, street, city]
 *             properties:
 *               label: { type: string, example: "Home" }
 *               recipientName: { type: string }
 *               phone: { type: string, example: "+923001234567" }
 *               street: { type: string }
 *               city: { type: string, example: "Lahore" }
 *               state: { type: string }
 *               postalCode: { type: string }
 *               country: { type: string, default: "Pakistan" }
 *               isDefault: { type: boolean }
 *     responses:
 *       201:
 *         description: Address saved
 * /addresses/{addressId}:
 *   get:
 *     summary: Get a saved shipping address by ID
 *     tags: [Addresses]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address fetched
 *   patch:
 *     summary: Update a shipping address
 *     tags: [Addresses]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address updated
 *   delete:
 *     summary: Delete a shipping address
 *     tags: [Addresses]
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Address deleted
 */
addressesRoutes.get("/addresses", requireAuth, asyncHandler(addressesController.getMyAddresses));
addressesRoutes.get("/addresses/:addressId", requireAuth, asyncHandler(addressesController.getAddressById));
addressesRoutes.post(
  "/addresses",
  requireAuth,
  validate(createAddressSchema),
  asyncHandler(addressesController.createAddress)
);
addressesRoutes.patch(
  "/addresses/:addressId",
  requireAuth,
  validate(updateAddressSchema),
  asyncHandler(addressesController.updateAddress)
);
addressesRoutes.put(
  "/addresses/:addressId",
  requireAuth,
  validate(updateAddressSchema),
  asyncHandler(addressesController.updateAddress)
);
addressesRoutes.delete("/addresses/:addressId", requireAuth, asyncHandler(addressesController.deleteAddress));
