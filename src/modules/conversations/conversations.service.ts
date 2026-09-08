import {
  getDbClient,
  toSnakeCase,
} from "../../utils/resource-helper.js";
import { storageService } from "../../services/storage.service.js";
import { AppError } from "../../utils/app-error.js";

export const conversationsService = {
  async getConversations(userId: string | undefined, userRole: string | undefined, page = 1, limit = 20) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    let query = client
      .from("conversations")
      .select("*, participant1:profiles!participant1_id(*), participant2:profiles!participant2_id(*)", { count: "exact" });

    if (userId && userRole !== "admin") {
      query = query.or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`);
    }

    const { data, error, count } = await query
      .order("last_message_at", { ascending: false })
      .range((p - 1) * l, p * l - 1);

    if (error) throw new AppError(error.message, 400);

    return {
      records: data ?? [],
      page: p,
      limit: l,
      total: count ?? 0,
      singleRecord: null,
    };
  },

  async getConversationById(conversationId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("conversations")
      .select("*, participant1:profiles!participant1_id(*), participant2:profiles!participant2_id(*), messages(*)")
      .eq("id", conversationId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async getConversationByParticipants(tailorId: string, clientId: string, _userId?: string, _userRole?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("conversations")
      .select("*, participant1:profiles!participant1_id(*), participant2:profiles!participant2_id(*), messages(*)")
      .or(`and(participant1_id.eq.${clientId},participant2_id.eq.${tailorId}),and(participant1_id.eq.${tailorId},participant2_id.eq.${clientId})`)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }

    return data;
  },

  async checkConversationExists(tailorId: string, clientId: string, userId?: string, userRole?: string) {
    const data = await this.getConversationByParticipants(tailorId, clientId, userId, userRole);

    return {
      exists: Boolean(data),
      conversation: data ?? null,
    };
  },

  async getOrCreateConversation(tailorId: string, clientId: string, initialMessage?: string, senderId?: string) {
    const client = getDbClient();
    let conversation = await this.getConversationByParticipants(tailorId, clientId);

    if (!conversation) {
      const { data: created, error } = await client
        .from("conversations")
        .insert({
          participant1_id: clientId, // participant1 = client
          participant2_id: tailorId, // participant2 = tailor
          last_message: initialMessage || "",
        })
        .select("*, participant1:profiles!participant1_id(*), participant2:profiles!participant2_id(*)")
        .single();

      if (error) throw new AppError(error.message, 400);
      conversation = created;

      if (initialMessage && senderId) {
        await client.from("messages").insert({
          conversation_id: created.id,
          sender_id: senderId,
          text: initialMessage,
        });
      }
    }

    return conversation;
  },

  async createConversation(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);

    const tailorId = (data.tailorId || data.tailor_id || data.participant2Id || data.participant2_id || data.participantId || data.participant_id) as string;
    const clientId = (data.clientId || data.client_id || data.participant1Id || data.participant1_id || userId) as string;

    if (!tailorId) {
      throw new AppError("Tailor ID (participant 2) or Participant ID is required", 400);
    }

    const initialMessage = (data.initialMessage || data.last_message || "") as string;
    return this.getOrCreateConversation(tailorId, clientId, initialMessage, userId);
  },

  async getMessagesByParticipants(tailorId: string, clientId: string, userId: string | undefined, userRole: string | undefined, page = 1, limit = 50) {
    const conversation = await this.getConversationByParticipants(tailorId, clientId, userId, userRole);

    if (!conversation) {
      const p = Math.max(1, page);
      const l = Math.min(100, Math.max(1, limit));
      return {
        records: [],
        page: p,
        limit: l,
        total: 0,
        singleRecord: null,
      };
    }

    return this.getMessages(conversation.id, userId, userRole, page, limit);
  },

  async getMessages(conversationId: string, _userId: string | undefined, _userRole: string | undefined, page = 1, limit = 50) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    const { data, error, count } = await client
      .from("messages")
      .select("*, sender:profiles!sender_id(*)", { count: "exact" })
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range((p - 1) * l, p * l - 1);

    if (error) throw new AppError(error.message, 400);

    return {
      records: data ?? [],
      page: p,
      limit: l,
      total: count ?? 0,
      singleRecord: null,
    };
  },

  async sendMessageByParticipants(tailorId: string, clientId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);

    const initialText = (data.text as string) || "Attachment sent";
    const conversation = await this.getOrCreateConversation(tailorId, clientId, initialText, userId);

    return this.sendMessage(conversation.id, userId, userRole, data);
  },

  async sendMessage(conversationId: string, userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("messages")
      .insert({
        ...mapped,
        conversation_id: conversationId,
        sender_id: userId,
      })
      .select("*, sender:profiles!sender_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);

    await client
      .from("conversations")
      .update({
        last_message: (data.text as string) || "Attachment sent",
        last_message_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    return created;
  },

  async markMessageRead(messageId: string, _userId: string | undefined, _userRole: string | undefined) {
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async addAttachment(messageId: string, _userId: string | undefined, _userRole: string | undefined, file?: Express.Multer.File, data: Record<string, unknown> = {}) {
    let fileUrl = (data.fileUrl || data.file_url || data.file) as string;
    if (file) {
      const fileExt = file.originalname?.split(".").pop() || "png";
      const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
      const path = `${messageId}/attach-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "png"}`;
      const { url } = await storageService.uploadFile("message-attachments", path, file.buffer, file.mimetype);
      fileUrl = url;
    }

    if (!fileUrl) {
      throw new AppError("Attachment file or fileUrl is required", 400);
    }

    const client = getDbClient();
    const { data: msg } = await client.from("messages").select("attachments").eq("id", messageId).single();
    const currentAttachments = (msg?.attachments as string[]) || [];

    const { data: updated, error } = await client
      .from("messages")
      .update({ attachments: [...currentAttachments, fileUrl] })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },
};

