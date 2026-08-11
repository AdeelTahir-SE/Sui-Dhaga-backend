export interface UpdateProfilePayload {
  name?: string;
  phone?: string;
  address?: string;
  bio?: string;
}

export interface UpdateAvatarPayload {
  avatarUrl: string;
}
