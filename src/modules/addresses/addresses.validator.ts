import { z } from "zod";

export const createAddressSchema = z
  .object({
    label: z.string().trim().max(60).optional(),
    recipientName: z.string().trim().min(1).max(120).optional(),
    recipient_name: z.string().trim().min(1).max(120).optional(),
    fullName: z.string().trim().min(1).max(120).optional(),
    phone: z.string().trim().min(7).max(20),
    street: z.string().trim().min(2).max(255).optional(),
    addressLine1: z.string().trim().min(2).max(255).optional(),
    address_line_1: z.string().trim().min(2).max(255).optional(),
    addressLine2: z.string().trim().max(255).optional(),
    address_line_2: z.string().trim().max(255).optional(),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().max(80).optional(),
    province: z.string().trim().max(80).optional(),
    postalCode: z.string().trim().max(20).optional(),
    postal_code: z.string().trim().max(20).optional(),
    country: z.string().trim().max(80).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
    isDefault: z.boolean().optional(),
    is_default: z.boolean().optional(),
  })
  .refine(
    (data) => Boolean(data.street || data.addressLine1 || data.address_line_1),
    { message: "Street address is required" }
  );

export const updateAddressSchema = z.object({
  label: z.string().trim().max(60).optional(),
  recipientName: z.string().trim().min(1).max(120).optional(),
  recipient_name: z.string().trim().min(1).max(120).optional(),
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  street: z.string().trim().min(2).max(255).optional(),
  addressLine1: z.string().trim().min(2).max(255).optional(),
  address_line_1: z.string().trim().min(2).max(255).optional(),
  addressLine2: z.string().trim().max(255).optional(),
  address_line_2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  state: z.string().trim().max(80).optional(),
  province: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  postal_code: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  isDefault: z.boolean().optional(),
  is_default: z.boolean().optional(),
});
