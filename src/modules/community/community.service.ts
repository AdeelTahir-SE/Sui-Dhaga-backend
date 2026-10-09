import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { storageService } from "../../services/storage.service.js";
import { AppError } from "../../utils/app-error.js";

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  userId?: string;
  authorId?: string;
}

export const communityService = {
  async getPosts(options: GetPostsOptions = {}) {
    const client = getDbClient();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = client
      .from("community_posts")
      .select("id, user_id, title, content, images, tags, category, likes_count, saves_count, created_at, updated_at, author:profiles!user_id(id, full_name, avatar_url, role)", { count: "exact" });

    // Author filter
    if (options.authorId) {
      query = query.eq("user_id", options.authorId);
    }

    // Category filter (if not "All", "For You", "Trending")
    if (
      options.category &&
      !["all", "for you", "trending"].includes(options.category.trim().toLowerCase())
    ) {
      const cat = options.category.trim();
      query = query.or(`category.ilike.%${cat}%,tags.cs.{${cat}}`);
    }

    // Tag filter
    if (options.tag) {
      const cleanTag = options.tag.replace(/^#/, "").trim();
      if (cleanTag) {
        query = query.contains("tags", [cleanTag]);
      }
    }

    // Search filter
    if (options.search && options.search.trim()) {
      const q = options.search.trim();
      query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,category.ilike.%${q}%`);
    }

    // Sort order: "Trending" sorts by likes_count desc, otherwise created_at desc
    if (options.category && options.category.trim().toLowerCase() === "trending") {
      query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, count, error } = await query.range(from, to);
    if (error) throw new AppError(error.message, 400);

    let posts = (data ?? []) as any[];

    // If authenticated userId is passed, attach is_liked and is_saved
    if (options.userId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      try {
        const [likesRes, savesRes] = await Promise.all([
          client.from("community_likes").select("post_id").eq("user_id", options.userId).in("post_id", postIds),
          client.from("community_saves").select("post_id").eq("user_id", options.userId).in("post_id", postIds),
        ]);

        const likedSet = new Set((likesRes.data ?? []).map((l) => l.post_id));
        const savedSet = new Set((savesRes.data ?? []).map((s) => s.post_id));

        posts = posts.map((p) => {
          const isLiked = likedSet.has(p.id);
          const isSaved = savedSet.has(p.id);
          return {
            ...p,
            is_liked: isLiked,
            isLiked: isLiked,
            is_saved: isSaved,
            isSaved: isSaved,
          };
        });
      } catch {
        posts = posts.map((p) => ({
          ...p,
          is_liked: false,
          isLiked: false,
          is_saved: false,
          isSaved: false,
        }));
      }
    } else {
      posts = posts.map((p) => ({
        ...p,
        is_liked: false,
        isLiked: false,
        is_saved: false,
        isSaved: false,
      }));
    }

    return {
      records: posts,
      total: count ?? posts.length,
      page,
      limit,
    };
  },

  async getPostById(postId: string, userId?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("community_posts")
      .select("id, user_id, title, content, images, tags, category, likes_count, saves_count, created_at, updated_at, author:profiles!user_id(id, full_name, avatar_url, role), comments:community_comments(id, post_id, user_id, content, created_at, user:profiles!user_id(id, full_name, avatar_url, role))")
      .eq("id", postId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (!data) return null;

    let post = data as any;
    if (userId) {
      try {
        const [likeRes, saveRes] = await Promise.all([
          client.from("community_likes").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
          client.from("community_saves").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle(),
        ]);
        const isLiked = Boolean(likeRes?.data);
        const isSaved = Boolean(saveRes?.data);
        post.is_liked = isLiked;
        post.isLiked = isLiked;
        post.is_saved = isSaved;
        post.isSaved = isSaved;
      } catch {
        post.is_liked = false;
        post.isLiked = false;
        post.is_saved = false;
        post.isSaved = false;
      }
    } else {
      post.is_liked = false;
      post.isLiked = false;
      post.is_saved = false;
      post.isSaved = false;
    }
    return post;
  },

  async createPost(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>, files?: Express.Multer.File[]) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);

    let imageUrls: string[] = Array.isArray(data.images) ? [...(data.images as string[])] : [];
    if (typeof data.images === "string") {
      imageUrls = [data.images];
    }

    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        let fileExt = file.originalname?.split(".").pop();
        if (!fileExt || fileExt === file.originalname) {
          if (file.mimetype?.includes("mp4")) fileExt = "mp4";
          else if (file.mimetype?.includes("quicktime")) fileExt = "mov";
          else if (file.mimetype?.includes("webm")) fileExt = "webm";
          else if (file.mimetype?.startsWith("video/")) fileExt = "mp4";
          else fileExt = "png";
        }
        const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
        const path = `${userId}/post-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${cleanExt || "png"}`;
        const { url } = await storageService.uploadFile("community-posts", path, file.buffer, file.mimetype);
        return url;
      });
      const uploadedUrls = await Promise.all(uploadPromises);
      imageUrls = [...imageUrls, ...uploadedUrls];
    }

    if (imageUrls.length > 0) {
      mapped.images = imageUrls;
    }

    // Map caption to content if needed and strip caption from db payload
    if (!mapped.content && (data.caption || mapped.caption)) {
      mapped.content = (data.caption || mapped.caption) as string;
    }
    delete (mapped as any).caption;

    // Default title if omitted
    if (!mapped.title) {
      mapped.title = (data.category as string) || ((mapped.content as string)?.slice(0, 40)) || "Custom Outfit";
    }
    if (!mapped.content) {
      mapped.content = mapped.title as string;
    }

    if (data.category) {
      mapped.category = data.category;
    }

    if (typeof mapped.tags === "string") {
      mapped.tags = (mapped.tags as string).split(",").map((t) => t.trim()).filter(Boolean);
    }

    // Prepare strict database columns matching public.community_posts
    const postPayload: Record<string, unknown> = {
      user_id: userId,
      title: mapped.title,
      content: mapped.content,
      images: mapped.images || [],
      tags: mapped.tags || [],
    };
    if (mapped.category) {
      postPayload.category = mapped.category;
    }

    const { data: created, error } = await client
      .from("community_posts")
      .insert(postPayload)
      .select("*, author:profiles!user_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updatePost(postId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    if (!mapped.content && (data.caption || mapped.caption)) {
      mapped.content = (data.caption || mapped.caption) as string;
    }
    delete (mapped as any).caption;

    const allowedColumns = ["title", "content", "images", "tags", "category"];
    const updatePayload: Record<string, unknown> = {};
    for (const col of allowedColumns) {
      if (col in mapped) {
        updatePayload[col] = mapped[col];
      }
    }

    let query = client.from("community_posts").update(updatePayload).eq("id", postId);

    if (userId && userRole !== "admin") {
      query = query.eq("user_id", userId);
    }

    const { data: updated, error } = await query.select().single();
    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deletePost(postId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteTableData({
      table: "community_posts",
      id: postId,
      userId,
      userRole,
    });
  },

  async toggleLike(postId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data: existing } = await client
      .from("community_likes")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    let liked = false;
    if (existing) {
      await client.from("community_likes").delete().eq("post_id", postId).eq("user_id", userId);
      liked = false;
    } else {
      const { error: insertError } = await client.from("community_likes").insert({ post_id: postId, user_id: userId });
      if (insertError && insertError.code !== "23505") {
        throw new AppError(insertError.message, 400);
      }
      liked = true;
    }

    // Always calculate exact row count from community_likes to prevent count drift or race conditions
    const { count: actualLikesCount } = await client
      .from("community_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    const safeLikesCount = actualLikesCount ?? 0;
    const { data: updated } = await client
      .from("community_posts")
      .update({ likes_count: safeLikesCount })
      .eq("id", postId)
      .select()
      .maybeSingle();

    return {
      liked,
      post: updated
        ? {
            ...updated,
            likesCount: safeLikesCount,
            likes_count: safeLikesCount,
            isLiked: liked,
            is_liked: liked,
          }
        : null,
    };
  },

  async toggleSave(postId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data: existing } = await client
      .from("community_saves")
      .select("post_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    let saved = false;
    if (existing) {
      await client.from("community_saves").delete().eq("post_id", postId).eq("user_id", userId);
      saved = false;
    } else {
      const { error: insertError } = await client.from("community_saves").insert({ post_id: postId, user_id: userId });
      if (insertError && insertError.code !== "23505") {
        throw new AppError(insertError.message, 400);
      }
      saved = true;
    }

    const { count: actualSavesCount } = await client
      .from("community_saves")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    const safeSavesCount = actualSavesCount ?? 0;
    const { data: updated } = await client
      .from("community_posts")
      .update({ saves_count: safeSavesCount })
      .eq("id", postId)
      .select()
      .maybeSingle();

    return {
      saved,
      post: updated
        ? {
            ...updated,
            savesCount: safeSavesCount,
            saves_count: safeSavesCount,
            isSaved: saved,
            is_saved: saved,
          }
        : null,
    };
  },

  async getComments(postId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("community_comments")
      .select("id, post_id, user_id, content, created_at, user:profiles!user_id(id, full_name, avatar_url, role)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw new AppError(error.message, 400);
    return data ?? [];
  },

  async addComment(postId: string, userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const content = (((data.content || data.text || "") as string) || "").trim();
    if (!content) throw new AppError("Comment cannot be empty", 400);

    const { data: created, error } = await client
      .from("community_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        content,
      })
      .select("*, user:profiles!user_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);

    // Sync comments_count in community_posts using exact count from community_comments to avoid double-counting
    try {
      const { count: actualCommentsCount } = await client
        .from("community_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      const safeCount = actualCommentsCount ?? 1;
      await client.from("community_posts").update({ comments_count: safeCount }).eq("id", postId);
      (created as any).comments_count = safeCount;
      (created as any).commentsCount = safeCount;
    } catch {
      // Trigger handles or ignore
    }

    return created;
  },
};
