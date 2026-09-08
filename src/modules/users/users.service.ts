import { getDbClient, toSnakeCase } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { storageService } from "../../services/storage.service.js";

export const usersService = {
  async getMyProfile(userId: string, _userRole?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async updateMyProfile(userId: string, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    if (mapped.name) {
      mapped.full_name = mapped.name;
      delete mapped.name;
    }
    const { data: updated, error } = await client
      .from("profiles")
      .update(mapped)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async updateAvatar(userId: string, _userRole: string | undefined, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new AppError("Avatar file is required", 400);
    }

    const fileExt = file.originalname?.split(".").pop() || "png";
    const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `${userId}/avatar-${Date.now()}.${cleanExt || "png"}`;

    // Upload file to Supabase 'avatars' storage bucket
    const { url } = await storageService.uploadFile("avatars", fileName, file.buffer, file.mimetype);

    // Save avatar_url in profiles table
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteMyProfile(userId: string, _userRole?: string) {
    const client = getDbClient();
    const { error } = await client.from("profiles").delete().eq("id", userId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async getUserById(userId: string, _currentUserId?: string, _userRole?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .select("id, role, status, full_name, bio, avatar_url, created_at")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },
};


