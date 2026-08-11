export interface CreateConversationPayload {
  participantId: string;
  initialMessage?: string;
}

export interface SendMessagePayload {
  text: string;
  attachments?: string[];
}

export interface AddAttachmentPayload {
  fileUrl: string;
  fileType?: string;
}
