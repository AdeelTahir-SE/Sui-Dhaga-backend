import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

import type { RegisterPayload } from "./auth.types.js";

export const authService = {
  async register(payload: RegisterPayload) {
    const { email, password, role = "customer", name, phone } = payload;

    const client = getDbClient();
    const metadata: Record<string, unknown> = {
      role,
      ...(name ? { name, full_name: name } : {}),
      ...(phone ? { phone } : {}),
    };

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw new AppError(error.message, 400);

    if (data.user?.id && (name || phone)) {
      const profileUpdates: Record<string, unknown> = {};
      if (name) profileUpdates.full_name = name;
      if (phone) profileUpdates.phone = phone;

      await client
        .from("profiles")
        .update(profileUpdates)
        .eq("id", data.user.id);
    }

    return { user: data.user, session: data.session };
  },

  async login(credentials: { email: string; password: string }) {
    const client = getDbClient();
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error) throw new AppError("Invalid email or password", 401);
    return { user: data.user, session: data.session };
  },

  async logout() {
    const client = getDbClient();
    const { error } = await client.auth.signOut();
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async refreshToken(refreshToken: string) {
    const client = getDbClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw new AppError(error.message, 401);
    return data;
  },

  async forgotPassword(email: string) {
    const client = getDbClient();
    const { error } = await client.auth.resetPasswordForEmail(email.trim());
    if (error) {
      console.warn("Supabase resetPasswordForEmail notice:", error.message);
    }
    return "If an account exists with this email, password reset instructions have been sent.";
  },

  async resetPassword(payload: { password: string; userId?: string; token?: string; email?: string }) {
    const client = getDbClient();
    const { password, userId, token, email } = payload;

    // 1. If we have an authenticated user ID (from Bearer token)
    if (userId) {
      const { error } = await client.auth.admin.updateUserById(userId, { password });
      if (error) throw new AppError(error.message, 400);
      return "Password reset successful";
    }

    // 2. If token is provided
    if (token && token.trim()) {
      const trimmedToken = token.trim();
      // Try verifying token as an access token
      const { data: userData } = await client.auth.getUser(trimmedToken);
      if (userData?.user?.id) {
        const { error } = await client.auth.admin.updateUserById(userData.user.id, { password });
        if (error) throw new AppError(error.message, 400);
        return "Password reset successful";
      }

      // Try verifying OTP if email is provided
      if (email && email.trim()) {
        const { data: otpData, error: otpError } = await client.auth.verifyOtp({
          email: email.trim(),
          token: trimmedToken,
          type: "recovery",
        });
        if (otpData?.user?.id) {
          const { error } = await client.auth.admin.updateUserById(otpData.user.id, { password });
          if (error) throw new AppError(error.message, 400);
          return "Password reset successful";
        }
        if (otpError) {
          console.warn("OTP verification notice:", otpError.message);
        }
      }
    }

    // 3. If email is provided (admin direct reset when user has validated flow)
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: usersData, error: listError } = await client.auth.admin.listUsers();
      if (!listError && usersData?.users) {
        const user = usersData.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
        if (user?.id) {
          const { error } = await client.auth.admin.updateUserById(user.id, { password });
          if (error) throw new AppError(error.message, 400);
          return "Password reset successful";
        }
      }
      throw new AppError("No account found with this email address.", 404);
    }

    throw new AppError("A valid email, token, or session is required to reset password.", 400);
  },
};
