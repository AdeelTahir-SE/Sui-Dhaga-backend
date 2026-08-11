import type { UserRole } from "../../types/index.js";

export interface RegisterPayload {
  email: string;
  password: string;
  role?: UserRole;
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
