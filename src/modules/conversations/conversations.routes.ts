import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validation.middleware.js";
import { uploadAnyMedia } from "../../middlewares/upload.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";
import * as conversationsController from "./conversations.controller.js";
import {
  createConversationSchema,
  sendMessageSchema,
  addAttachmentSchema,
} from "./conversations.validator.js";

export const conversationsRoutes = Router();

/**
 * @openapi
 * /conversations:
 *   get:
 *     summary: List user conversations
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of conversations retrieved successfully
 *   post:
 *     summary: Start or get an existing conversation
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tailorId:
 *                 type: string
 *                 description: Tailor ID (participant 2)
 *               clientId:
 *                 type: string
 *                 description: Client ID (participant 1, defaults to authenticated user)
 *               participantId:
 *                 type: string
 *                 description: Target participant ID
 *               initialMessage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conversation created or retrieved successfully
 */
conversationsRoutes.get("/conversations", requireAuth, asyncHandler(conversationsController.getConversations));
conversationsRoutes.post("/conversations", requireAuth, validate(createConversationSchema), asyncHandler(conversationsController.createConversation));

/**
 * @openapi
 * /conversations/{tailorId}/{clientId}/messages:
 *   get:
 *     summary: Get messages in conversation between tailor and client
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tailor ID (participant 2)
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID (participant 1)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *   post:
 *     summary: Send a message in conversation between tailor and client
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tailor ID (participant 2)
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID (participant 1)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
conversationsRoutes.get("/conversations/:tailorId/:clientId/messages", requireAuth, asyncHandler(conversationsController.getMessagesByTailorAndClient));
conversationsRoutes.post("/conversations/:tailorId/:clientId/messages", requireAuth, validate(sendMessageSchema), asyncHandler(conversationsController.sendMessageByTailorAndClient));

/**
 * @openapi
 * /conversations/{tailorId}/{clientId}:
 *   get:
 *     summary: Get or check conversation between tailor and client
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tailorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tailor ID (participant 2)
 *       - in: path
 *         name: clientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID (participant 1)
 *     responses:
 *       200:
 *         description: Conversation existence status and data
 */
conversationsRoutes.get("/conversations/:tailorId/:clientId", requireAuth, asyncHandler(conversationsController.checkConversationExists));
conversationsRoutes.get("/conversation/:tailorId/:clientId", requireAuth, asyncHandler(conversationsController.checkConversationExists));

/**
 * @openapi
 * /conversations/{conversationId}:
 *   get:
 *     summary: Get conversation details by ID
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Conversation details retrieved
 *       404:
 *         description: Conversation not found
 */
conversationsRoutes.get("/conversations/:conversationId", requireAuth, asyncHandler(conversationsController.getConversationById));

/**
 * @openapi
 * /conversations/{conversationId}/messages:
 *   get:
 *     summary: Get messages in a conversation by conversation ID
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *   post:
 *     summary: Send a message in a conversation by conversation ID
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Message sent successfully
 */
conversationsRoutes.get("/conversations/:conversationId/messages", requireAuth, asyncHandler(conversationsController.getMessages));
conversationsRoutes.post("/conversations/:conversationId/messages", requireAuth, validate(sendMessageSchema), asyncHandler(conversationsController.sendMessage));

/**
 * @openapi
 * /messages/{messageId}/read:
 *   patch:
 *     summary: Mark a message as read
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Message marked as read
 */
conversationsRoutes.patch("/messages/:messageId/read", requireAuth, asyncHandler(conversationsController.markAsRead));

/**
 * @openapi
 * /messages/{messageId}/attachments:
 *   post:
 *     summary: Add file or image attachment to a chat message
 *     tags: [Conversations]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Attachment file (Image, PDF, Document)
 *               fileType:
 *                 type: string
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileUrl:
 *                 type: string
 *                 format: uri
 *               fileType:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attachment added successfully
 */
conversationsRoutes.post("/messages/:messageId/attachments", requireAuth, uploadAnyMedia("file"), validate(addAttachmentSchema), asyncHandler(conversationsController.addAttachment));

