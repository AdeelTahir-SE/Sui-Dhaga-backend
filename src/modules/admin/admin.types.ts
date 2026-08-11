export interface AdminBlockUserPayload {
  userId: string;
  blocked: boolean;
}

export interface AdminVerifyTailorPayload {
  tailorId: string;
  status: "verified" | "rejected";
}
