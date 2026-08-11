export interface CreateReviewPayload {
  rating: number;
  comment?: string;
  images?: string[];
}

export interface UpdateReviewPayload {
  rating?: number;
  comment?: string;
  images?: string[];
}
