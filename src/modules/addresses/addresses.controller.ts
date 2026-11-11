import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { addressesService } from "./addresses.service.js";

export const getMyAddresses: RequestHandler = async (req, res) => {
  const addresses = await addressesService.getMyAddresses(req.user!.id);
  success(res, addresses, "Addresses fetched successfully");
};

export const getAddressById: RequestHandler = async (req, res) => {
  const address = await addressesService.getAddressById(
    asString(req.params.addressId),
    req.user!.id,
    req.userRole
  );
  success(res, address, "Address fetched successfully");
};

export const createAddress: RequestHandler = async (req, res) => {
  const created = await addressesService.createAddress(req.user!.id, req.body);
  success(res, created, "Address saved successfully", 201);
};

export const updateAddress: RequestHandler = async (req, res) => {
  const updated = await addressesService.updateAddress(
    asString(req.params.addressId),
    req.user!.id,
    req.userRole,
    req.body
  );
  success(res, updated, "Address updated successfully");
};

export const deleteAddress: RequestHandler = async (req, res) => {
  await addressesService.deleteAddress(asString(req.params.addressId), req.user!.id, req.userRole);
  success(res, null, "Address deleted successfully");
};
