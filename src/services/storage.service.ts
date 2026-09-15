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
    let { data, error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      const errMsg = (error.message || "").toLowerCase();
      if (
        errMsg.includes("bucket not found") ||
        errMsg.includes("does not exist") ||
        (error as any).statusCode === 404 ||
        (error as any).status === 404
      ) {
        try {
          await supabase.storage.createBucket(bucket, { public: true });
          const retry = await supabase.storage.from(bucket).upload(path, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          });
          if (retry.error) throw new AppError(retry.error.message, 400);
          data = retry.data;
          error = null;
        } catch (bucketErr: any) {
          throw new AppError(bucketErr.message || errMsg || "Storage upload failed", 400);
        }
      } else {
        throw new AppError(error.message, 400);
      }
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data!.path);
    return { path: data!.path, url: publicUrlData.publicUrl };
  },

  async deleteFile(bucket: StorageBucket, path: string) {
    if (!supabase) return true;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw new AppError(error.message, 400);
    return true;
  },
};
