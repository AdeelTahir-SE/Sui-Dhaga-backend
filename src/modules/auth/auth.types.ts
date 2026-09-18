import type { UserRole } from "../../types/index.js";

export interface RegisterPayload {
  email: string;
  password: string;
  role?: UserRole;
  name?: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  password: string;
}

export interface GoogleAuthPayload {
  idToken?: string;
  accessToken?: string;
  token?: string;
  email?: string;
  name?: string;
  fullName?: string;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  googleId?: string;
}

export interface CompleteProfilePayload {
  role: "customer" | "tailor";
  phone?: string;
  name?: string;
  fullName?: string;
  shopName?: string;
  city?: string;
  address?: string;
  specialties?: string[];
}

