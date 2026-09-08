import { supabase } from "../config/supabase.js";
import { AppError } from "../utils/app-error.js";

export type StorageBucket =
  | "avatars"
  | "designs"
  | "tailor-gallery"
  | "tailor-banners"
  | "community-posts"
  | "verification-documents"
  | "message-attachments"
  | "exports"
  | "references";

export const storageService = {
  async uploadFile(bucket: StorageBucket, path: string, fileBuffer: Buffer, mimeType: string) {
    if (!supabase) {
      return { path, url: `https://storage.mock/${bucket}/${path}` };
    }
    const { data, error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) throw new AppError(error.message, 400);

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { path: data.path, url: publicUrlData.publicUrl };
  },

  async deleteFile(bucket: StorageBucket, path: string) {
    if (!supabase) return true;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw new AppError(error.message, 400);
    return true;
  },
};
