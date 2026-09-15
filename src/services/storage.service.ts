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
    const dataUriFallback = `data:${mimeType || "application/octet-stream"};base64,${fileBuffer.toString("base64")}`;

    if (!supabase) {
      return { path, url: dataUriFallback };
    }

    try {
      // Ensure bucket exists and is public
      try {
        await supabase.storage.createBucket(bucket, { public: true });
      } catch {}

      let { data, error } = await supabase.storage.from(bucket).upload(path, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

      if (error) {
        // Try to create/update bucket as public and retry upload
        try {
          await supabase.storage.createBucket(bucket, { public: true });
        } catch {}

        const retry = await supabase.storage.from(bucket).upload(path, fileBuffer, {
          contentType: mimeType,
          upsert: true,
        });

        if (retry.error) {
          console.warn("Supabase storage upload error, using data URI fallback:", retry.error.message);
          return { path, url: dataUriFallback };
        }
        data = retry.data;
      }

      if (data?.path) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        if (publicUrlData?.publicUrl) {
          return { path: data.path, url: publicUrlData.publicUrl };
        }
      }

      return { path, url: dataUriFallback };
    } catch (err: any) {
      console.warn("Storage upload exception, falling back to data URI:", err?.message);
      return { path, url: dataUriFallback };
    }
  },

  async deleteFile(bucket: StorageBucket, path: string) {
    if (!supabase) return true;
    try {
      await supabase.storage.from(bucket).remove([path]);
    } catch {}
    return true;
  },
};
