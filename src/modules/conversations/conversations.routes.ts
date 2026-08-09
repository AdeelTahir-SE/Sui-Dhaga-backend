import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { conversationsService } from "./conversations.service.js";

export const conversationsRoutes = Router();

conversationsRoutes.get(
  "/conversations",
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await conversationsService.getConversations(req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Conversations fetched successfully");
  }),
);

conversationsRoutes.post(
  "/conversations",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await conversationsService.createConversation(req.user?.id, req.userRole, req.body);
    success(res, created, "Conversation created successfully", 201);
  }),
);

conversationsRoutes.get(
  "/conversations/:conversationId",
  requireAuth,
  asyncHandler(async (req, res) => {
    const conversation = await conversationsService.getConversationById(asString(req.params.conversationId), req.user?.id, req.userRole);
    success(res, conversation, "Conversation fetched successfully");
  }),
);

conversationsRoutes.get(
  "/conversations/:conversationId/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const result = await conversationsService.getMessages(asString(req.params.conversationId), req.user?.id, req.userRole, page, limit);
    paginated(res, result.records, page, limit, result.total, "Messages fetched successfully");
  }),
);

conversationsRoutes.post(
  "/conversations/:conversationId/messages",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const created = await conversationsService.sendMessage(asString(req.params.conversationId), req.user?.id, req.userRole, req.body);
    success(res, created, "Message sent successfully", 201);
  }),
);

conversationsRoutes.patch(
  "/messages/:messageId/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const updated = await conversationsService.markMessageRead(asString(req.params.messageId), req.user?.id, req.userRole);
    success(res, updated, "Message marked as read");
  }),
);

conversationsRoutes.post(
  "/messages/:messageId/attachments",
  requireAuth,
  validate(z.record(z.unknown())),
  asyncHandler(async (req, res) => {
    const updated = await conversationsService.addAttachment(asString(req.params.messageId), req.user?.id, req.userRole, req.body);
    success(res, updated, "Attachment added successfully", 201);
  }),
);
