export interface CreateCommunityPostPayload {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
}

export interface UpdateCommunityPostPayload extends Partial<CreateCommunityPostPayload> {}

export interface AddCommunityCommentPayload {
  content: string;
}
