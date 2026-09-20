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
      .select("*, author:profiles!user_id(*)", { count: "exact" });

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

        posts = posts.map((p) => ({
          ...p,
          is_liked: likedSet.has(p.id),
          is_saved: savedSet.has(p.id),
        }));
      } catch {
        // Continue gracefully if like queries fail
      }
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
      .select("*, author:profiles!user_id(*), comments:community_comments(*, user:profiles!user_id(*))")
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
          client.from("community_likes").select("post_id").eq("post_id", postId).eq("user_id", userId).single(),
          client.from("community_saves").select("post_id").eq("post_id", postId).eq("user_id", userId).single(),
        ]);
        post.is_liked = Boolean(likeRes.data);
        post.is_saved = Boolean(saveRes.data);
      } catch {
        // Continue gracefully
      }
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
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await client.from("community_likes").delete().eq("post_id", postId).eq("user_id", userId);
      const { data: post } = await client.from("community_posts").select("likes_count").eq("id", postId).single();
      const count = Math.max(0, (post?.likes_count ?? 1) - 1);
      const { data: updated } = await client.from("community_posts").update({ likes_count: count }).eq("id", postId).select().single();
      return { liked: false, post: updated ? { ...updated, is_liked: false } : null };
    } else {
      await client.from("community_likes").insert({ post_id: postId, user_id: userId });
      const { data: post } = await client.from("community_posts").select("likes_count").eq("id", postId).single();
      const count = (post?.likes_count ?? 0) + 1;
      const { data: updated } = await client.from("community_posts").update({ likes_count: count }).eq("id", postId).select().single();
      return { liked: true, post: updated ? { ...updated, is_liked: true } : null };
    }
  },

  async toggleSave(postId: string, userId: string | undefined, _userRole: string | undefined) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { data: existing } = await client
      .from("community_saves")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await client.from("community_saves").delete().eq("post_id", postId).eq("user_id", userId);
      const { data: post } = await client.from("community_posts").select("saves_count").eq("id", postId).single();
      const count = Math.max(0, (post?.saves_count ?? 1) - 1);
      const { data: updated } = await client.from("community_posts").update({ saves_count: count }).eq("id", postId).select().single();
      return { saved: false, post: updated ? { ...updated, is_saved: false } : null };
    } else {
      await client.from("community_saves").insert({ post_id: postId, user_id: userId });
      const { data: post } = await client.from("community_posts").select("saves_count").eq("id", postId).single();
      const count = (post?.saves_count ?? 0) + 1;
      const { data: updated } = await client.from("community_posts").update({ saves_count: count }).eq("id", postId).select().single();
      return { saved: true, post: updated ? { ...updated, is_saved: true } : null };
    }
  },

  async getComments(postId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("community_comments")
      .select("*, user:profiles!user_id(*)")
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

    // Update comments_count in community_posts
    try {
      const { data: post } = await client.from("community_posts").select("comments_count").eq("id", postId).single();
      const count = (post?.comments_count ?? 0) + 1;
      await client.from("community_posts").update({ comments_count: count }).eq("id", postId);
    } catch {
      // Trigger handles or ignore
    }

    return created;
  },
};
