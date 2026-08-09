import {
  fetchResources,
  saveResource,
} from "../../utils/resource-helper.js";

export const conversationsService = {
  async getConversations(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "conversations",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async getConversationById(conversationId: string, userId: string | undefined, userRole: string | undefined) {
    const { singleRecord } = await fetchResources({
      resourceType: "conversations",
      id: conversationId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async createConversation(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "conversations",
      userId,
      userRole,
      data,
    });
  },

  async getMessages(conversationId: string, userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: `conversation_messages_${conversationId}`,
      userId,
      userRole,
      page,
      limit,
    });
  },

  async sendMessage(conversationId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: `conversation_messages_${conversationId}`,
      userId,
      userRole,
      data,
    });
  },

  async markMessageRead(messageId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "messages",
      id: messageId,
      userId,
      userRole,
      data: { read: true, read_at: new Date().toISOString() },
    });
  },

  async addAttachment(messageId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "messages",
      id: messageId,
      userId,
      userRole,
      data,
    });
  },
};
