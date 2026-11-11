import type { UserRole } from "../../types/index.js";

export interface RegisterPayload {
  email: string;
  password: string;
  role?: UserRole;
  name?: string;
  fullName?: string;
  full_name?: string;
  phone?: string;
  emailRedirectTo?: string;
  redirectTo?: string;
  appRedirect?: string;
}

export interface ResendConfirmationPayload {
  email: string;
  emailRedirectTo?: string;
  redirectTo?: string;
  appRedirect?: string;
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
  code?: string;
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
