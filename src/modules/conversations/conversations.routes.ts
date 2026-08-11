import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as conversationsController from "./conversations.controller.js";
import {
  createConversationSchema,
  sendMessageSchema,
  addAttachmentSchema,
} from "./conversations.validator.js";

export const conversationsRoutes = Router();

conversationsRoutes.get("/conversations", requireAuth, asyncHandler(conversationsController.getConversations));
conversationsRoutes.post("/conversations", requireAuth, validate(createConversationSchema), asyncHandler(conversationsController.createConversation));
conversationsRoutes.get("/conversations/:conversationId", requireAuth, asyncHandler(conversationsController.getConversationById));

conversationsRoutes.get("/conversations/:conversationId/messages", requireAuth, asyncHandler(conversationsController.getMessages));
conversationsRoutes.post("/conversations/:conversationId/messages", requireAuth, validate(sendMessageSchema), asyncHandler(conversationsController.sendMessage));

conversationsRoutes.patch("/messages/:messageId/read", requireAuth, asyncHandler(conversationsController.markAsRead));
conversationsRoutes.post("/messages/:messageId/attachments", requireAuth, validate(addAttachmentSchema), asyncHandler(conversationsController.addAttachment));
