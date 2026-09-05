import {
  getDbClient,
  toSnakeCase,
} from "../../utils/resource-helper.js";
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

  async createConversation(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const participantId = (data.participantId || data.participant_id) as string;
    if (!participantId) throw new AppError("Participant ID is required", 400);

    const { data: created, error } = await client
      .from("conversations")
      .insert({
        participant1_id: userId,
        participant2_id: participantId,
        last_message: (data.initialMessage || data.last_message || "") as string,
      })
      .select("*, participant1:profiles!participant1_id(*), participant2:profiles!participant2_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);

    if (data.initialMessage) {
      await client.from("messages").insert({
        conversation_id: created.id,
        sender_id: userId,
        text: data.initialMessage,
      });
    }

    return created;
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

  async addAttachment(messageId: string, _userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const fileUrl = (data.fileUrl || data.file_url) as string;
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

