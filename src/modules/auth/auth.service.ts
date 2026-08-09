import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const authService = {
  async register(email: string, password: string, role: string) {
    const client = getDbClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { role } },
    });
    if (error) throw new AppError(error.message, 400);
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
    await client.auth.resetPasswordForEmail(email);
    return "If this email exists, a reset link has been sent.";
  },

  async resetPassword(password: string) {
    const client = getDbClient();
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new AppError(error.message, 400);
    return "Password reset successful";
  },
};
