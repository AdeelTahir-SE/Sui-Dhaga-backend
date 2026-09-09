export interface CreateConversationPayload {
  tailorId?: string;
  clientId?: string;
  participantId?: string;
  participant_id?: string;
  tailor_id?: string;
  client_id?: string;
  initialMessage?: string;
  last_message?: string;
}

export interface SendMessagePayload {
  text?: string;
  attachments?: string[] | string;
  senderId?: string;
  sender_id?: string;
}

export interface AddAttachmentPayload {
  fileUrl?: string;
  file?: string;
  fileType?: string;
}

