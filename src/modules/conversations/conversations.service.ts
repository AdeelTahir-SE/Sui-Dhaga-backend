import {
  getDbClient,
  toSnakeCase,
} from "../../utils/resource-helper.js";
import { storageService } from "../../services/storage.service.js";
import { AppError } from "../../utils/app-error.js";
import { env } from "../../config/env.js";

function getFileExtension(filename?: string, mimetype?: string): string {
  if (filename && filename.includes(".")) {
    const ext = filename.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    if (ext && ext.length >= 2 && ext.length <= 5) return ext;
  }
  if (mimetype) {
    const mime = mimetype.toLowerCase();
    if (mime.includes("m4a") || mime.includes("aac") || mime.includes("mp4")) return "m4a";
    if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
    if (mime.includes("wav") || mime.includes("wave")) return "wav";
    if (mime.includes("webm")) return "webm";
    if (mime.includes("ogg") || mime.includes("opus")) return "ogg";
    if (mime.includes("caf")) return "caf";
    if (mime.includes("3gp") || mime.includes("3gpp")) return "3gp";
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("gif")) return "gif";
    if (mime.includes("pdf")) return "pdf";
  }
  return "bin";
}

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

  async getMessagesByParticipants(
    tailorId: string,
    clientId: string,
    userId: string | undefined,
    userRole: string | undefined,
    page = 1,
    limit = 20,
    before?: string,
    order?: string,
  ) {
    const conversation = await this.getConversationByParticipants(tailorId, clientId, userId, userRole);

    if (!conversation) {
      const p = Math.max(1, page);
      const l = Math.min(100, Math.max(1, limit));
      return {
        records: [],
        page: p,
        limit: l,
        total: 0,
        hasMore: false,
        singleRecord: null,
      };
    }

    return this.getMessages(conversation.id, userId, userRole, page, limit, before, order);
  },

  async getMessages(
    conversationId: string,
    _userId: string | undefined,
    _userRole: string | undefined,
    page = 1,
    limit = 20,
    before?: string,
    order?: string,
  ) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    let query = client
      .from("messages")
      .select("*, sender:profiles!sender_id(*)", { count: "exact" })
      .eq("conversation_id", conversationId);

    let isReversed = false;

    if (before) {
      // Cursor-based pagination: fetch messages older than `before` timestamp
      query = query
        .lt("created_at", before)
        .order("created_at", { ascending: false })
        .limit(l);
      isReversed = true;
    } else if (order === "asc") {
      // Ascending offset pagination
      query = query
        .order("created_at", { ascending: true })
        .range((p - 1) * l, p * l - 1);
    } else {
      // Default: fetch the latest `l` messages (descending), then reverse them for chronological view
      query = query
        .order("created_at", { ascending: false })
        .range((p - 1) * l, p * l - 1);
      isReversed = true;
    }

    const { data, error, count } = await query;

    if (error) throw new AppError(error.message, 400);

    const records = data ? [...data] : [];
    if (isReversed) {
      records.reverse(); // Chronological: oldest first, latest last
    }

    const total = count ?? 0;
    const hasMore = before
      ? records.length === l
      : (p * l) < total;

    return {
      records,
      page: p,
      limit: l,
      total,
      hasMore,
      singleRecord: null,
    };
  },

  async sendMessageByParticipants(
    tailorId: string,
    clientId: string,
    userId: string | undefined,
    userRole: string | undefined,
    data: Record<string, unknown>,
    files?: Express.Multer.File[] | Express.Multer.File
  ) {
    const senderId = (data.senderId || data.sender_id || userId) as string;
    if (!senderId) throw new AppError("Authentication required", 401);

    const hasFiles = Boolean(Array.isArray(files) ? files.length > 0 : files);
    const initialText = (data.text as string) || (hasFiles ? "Attachment sent" : "Hello");
    const conversation = await this.getOrCreateConversation(tailorId, clientId, initialText, senderId);

    return this.sendMessage(conversation.id, senderId, userRole, data, files);
  },

  async sendMessage(
    conversationId: string,
    userId: string | undefined,
    _userRole: string | undefined,
    data: Record<string, unknown>,
    files?: Express.Multer.File[] | Express.Multer.File
  ) {
    const senderId = (data.senderId || data.sender_id || userId) as string;
    if (!senderId) throw new AppError("Authentication required", 401);

    let attachments: string[] = [];
    if (Array.isArray(data.attachments)) {
      attachments = [...(data.attachments as string[])];
    } else if (typeof data.attachments === "string" && data.attachments.trim().length > 0) {
      try {
        const parsed = JSON.parse(data.attachments);
        if (Array.isArray(parsed)) {
          attachments = parsed;
        } else {
          attachments = [data.attachments];
        }
      } catch {
        attachments = [data.attachments];
      }
    }

    const uploadedFiles: Express.Multer.File[] = Array.isArray(files)
      ? files
      : files
      ? [files]
      : [];

    for (const file of uploadedFiles) {
      if (!file || !file.buffer) continue;
      const cleanExt = getFileExtension(file.originalname, file.mimetype);
      const path = `${conversationId}/attach-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
      const mime = file.mimetype || (cleanExt === "m4a" ? "audio/m4a" : "application/octet-stream");
      const { url } = await storageService.uploadFile("message-attachments", path, file.buffer, mime);
      attachments.push(url);
    }

    const rawText = typeof data.text === "string" ? data.text.trim() : "";
    const text = rawText || (attachments.length > 0 ? "Attachment sent" : "");

    if (!text && attachments.length === 0) {
      throw new AppError("Message must contain text or an attachment", 400);
    }

    const client = getDbClient();

    const { data: created, error } = await client
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        text,
        attachments,
      })
      .select("*, sender:profiles!sender_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);

    await client
      .from("conversations")
      .update({
        last_message: text || "Attachment sent",
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

  async addAttachment(
    messageId: string,
    _userId: string | undefined,
    _userRole: string | undefined,
    files?: Express.Multer.File[] | Express.Multer.File,
    data: Record<string, unknown> = {}
  ) {
    const newAttachments: string[] = [];

    if (data.fileUrl || data.file_url) {
      newAttachments.push(String(data.fileUrl || data.file_url));
    }

    const uploadedFiles: Express.Multer.File[] = Array.isArray(files)
      ? files
      : files
      ? [files]
      : [];

    for (const file of uploadedFiles) {
      if (!file || !file.buffer) continue;
      const cleanExt = getFileExtension(file.originalname, file.mimetype);
      const path = `${messageId}/attach-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt}`;
      const mime = file.mimetype || (cleanExt === "m4a" ? "audio/m4a" : "application/octet-stream");
      const { url } = await storageService.uploadFile("message-attachments", path, file.buffer, mime);
      newAttachments.push(url);
    }

    if (newAttachments.length === 0) {
      throw new AppError("Attachment file or fileUrl is required", 400);
    }

    const client = getDbClient();
    const { data: msg } = await client.from("messages").select("attachments").eq("id", messageId).single();
    const currentAttachments = (msg?.attachments as string[]) || [];

    const { data: updated, error } = await client
      .from("messages")
      .update({ attachments: [...currentAttachments, ...newAttachments] })
      .eq("id", messageId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  getRealtimeConfig() {
    return {
      supabaseUrl: env.SUPABASE_URL || "",
      supabaseAnonKey: env.SUPABASE_ANON_KEY || "",
    };
  },
};

