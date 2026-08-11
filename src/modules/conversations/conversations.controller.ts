import type { RequestHandler } from "express";
import { paginated, success } from "../../utils/api-response.js";
import { asString } from "../../utils/resource-helper.js";
import { conversationsService } from "./conversations.service.js";

export const getConversations: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await conversationsService.getConversations(req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Conversations fetched successfully");
};

export const createConversation: RequestHandler = async (req, res) => {
  const created = await conversationsService.createConversation(req.user?.id, req.userRole, req.body);
  success(res, created, "Conversation created successfully", 201);
};

export const getConversationById: RequestHandler = async (req, res) => {
  const conversation = await conversationsService.getConversationById(asString(req.params.conversationId), req.user?.id, req.userRole);
  success(res, conversation, "Conversation fetched successfully");
};

export const getMessages: RequestHandler = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const result = await conversationsService.getMessages(asString(req.params.conversationId), req.user?.id, req.userRole, page, limit);
  paginated(res, result.records, page, limit, result.total, "Messages fetched successfully");
};

export const sendMessage: RequestHandler = async (req, res) => {
  const message = await conversationsService.sendMessage(asString(req.params.conversationId), req.user?.id, req.userRole, req.body);
  success(res, message, "Message sent successfully", 201);
};

export const markAsRead: RequestHandler = async (req, res) => {
  const updated = await conversationsService.markMessageRead(asString(req.params.messageId), req.user?.id, req.userRole);
  success(res, updated, "Message marked as read");
};

export const addAttachment: RequestHandler = async (req, res) => {
  const updated = await conversationsService.addAttachment(asString(req.params.messageId), req.user?.id, req.userRole, req.body);
  success(res, updated, "Attachment added successfully", 201);
};
