export interface UpdateProfilePayload {
  name?: string;
  fullName?: string;
  full_name?: string;
  phone?: string;
  address?: string;
  bio?: string;
  avatarUrl?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  removeAvatar?: boolean;
}

export interface UpdateAvatarPayload {
  avatarUrl?: string | null;
  avatar_url?: string | null;
  avatar?: string | null;
  image?: string | null;
  imageUrl?: string | null;
  url?: string | null;
  dataUrl?: string | null;
  base64?: string;
  mimeType?: string;
  fileName?: string;
}
