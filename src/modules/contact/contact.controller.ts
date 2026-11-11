import type { RequestHandler } from "express";
import { success } from "../../utils/api-response.js";
import { contactService } from "./contact.service.js";

export const submitContact: RequestHandler = async (req, res) => {
  const result = await contactService.submitContactMessage(req.body, req.user?.id);
  success(res, result, "Your message has been sent successfully", 201);
};
