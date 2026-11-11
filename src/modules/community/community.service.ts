import {
  getDbClient,
  toSnakeCase,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { storageService } from "../../services/storage.service.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingColumnError, isMissingTableError } from "../../utils/supabase-error.js";

export interface GetPostsOptions {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  tab?: string;
  visibility?: string;
  userId?: string;
  authorId?: string;
  authorIds?: string[];
}

const POST_SELECT_WITH_EXTRAS =
  "id, user_id, title, content, images, tags, category, visibility, likes_count, saves_count, comments_count, created_at, updated_at, author:profiles!user_id(id, full_name, avatar_url, role)";
const POST_SELECT_BASE =
  "id, user_id, title, content, images, tags, category, likes_count, saves_count, created_at, updated_at, author:profiles!user_id(id, full_name, avatar_url, role)";

/**
 * Attaches user interaction flags (`is_liked`, `is_saved`, `is_following`, `comments_count`) to post rows.
 */
async function hydratePosts(
  posts: any[],
  client: ReturnType<typeof getDbClient>,
  userId?: string
): Promise<any[]> {
  if (!posts.length) return posts;

  const postIds = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.user_id).filter(Boolean)));

  let likedSet = new Set<string>();
  let savedSet = new Set<string>();
  let followedSet = new Set<string>();
  const commentCounts = new Map<string, number>();

  try {
    const tasks: Array<PromiseLike<any>> = [
      client.from("community_comments").select("post_id").in("post_id", postIds),
    ];

    if (userId) {
      tasks.push(
        client.from("community_likes").select("post_id").eq("user_id", userId).in("post_id", postIds),
        client.from("community_saves").select("post_id").eq("user_id", userId).in("post_id", postIds),
        authorIds.length
          ? client
              .from("user_follows")
              .select("following_id")
              .eq("follower_id", userId)
              .in("following_id", authorIds)
          : Promise.resolve({ data: [] })
      );
    }

    const [commentsRes, likesRes, savesRes, followsRes] = await Promise.all(tasks);

    for (const row of commentsRes?.data ?? []) {
      commentCounts.set(row.post_id, (commentCounts.get(row.post_id) ?? 0) + 1);
    }
    if (likesRes?.data) likedSet = new Set(likesRes.data.map((l: any) => l.post_id));
    if (savesRes?.data) savedSet = new Set(savesRes.data.map((s: any) => s.post_id));
    if (followsRes && !isMissingTableError(followsRes.error) && followsRes.data) {
      followedSet = new Set(followsRes.data.map((f: any) => f.following_id));
    }
  } catch {
    // Graceful fallback if auxiliary interaction queries fail
  }

  return posts.map((p) => {
    const isLiked = likedSet.has(p.id);
    const isSaved = savedSet.has(p.id);
    const isFollowing = followedSet.has(p.user_id);
    const resolvedCommentsCount =
      typeof p.comments_count === "number"
        ? Math.max(p.comments_count, commentCounts.get(p.id) ?? 0)
        : commentCounts.get(p.id) ?? 0;

    return {
      ...p,
      visibility: p.visibility || "public",
      comments_count: resolvedCommentsCount,
      commentsCount: resolvedCommentsCount,
      is_liked: isLiked,
      isLiked,
      is_saved: isSaved,
      isSaved,
      is_following: isFollowing,
      isFollowing,
      author: p.author
        ? { ...p.author, is_following: isFollowing, isFollowing }
        : p.author,
    };
  });
}

export const communityService = {
  async getFollowedUserIds(userId: string): Promise<string[]> {
    const client = getDbClient();
    const { data, error } = await client
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (error) {
      if (isMissingTableError(error)) return [];
      throw new AppError(error.message, 400);
    }

    return (data ?? []).map((row: any) => row.following_id).filter(Boolean);
  },

  async getPosts(options: GetPostsOptions = {}) {
    const client = getDbClient();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const normalizedTab = options.tab?.trim().toLowerCase();
    let followedIdsFilter = options.authorIds;

    if (normalizedTab === "following") {
      if (!options.userId) {
        return { records: [], total: 0, page, limit };
      }
      followedIdsFilter = await this.getFollowedUserIds(options.userId);
      if (followedIdsFilter.length === 0) {
        return { records: [], total: 0, page, limit };
      }
    }

    const buildQuery = (selectClause: string, includeVisibilityFilter: boolean) => {
      let query = client.from("community_posts").select(selectClause, { count: "exact" });

      if (options.authorId) {
        query = query.eq("user_id", options.authorId);
      } else if (followedIdsFilter && followedIdsFilter.length > 0) {
        query = query.in("user_id", followedIdsFilter);
      }

      if (includeVisibilityFilter) {
        if (options.visibility && ["public", "followers", "private"].includes(options.visibility)) {
          if (options.visibility === "private" && options.userId) {
            query = query.eq("visibility", "private").eq("user_id", options.userId);
          } else {
            query = query.eq("visibility", options.visibility);
          }
        } else if (!options.authorId || options.authorId !== options.userId) {
          query = query.neq("visibility", "private");
        }
      }

      if (
        options.category &&
        !["all", "for you", "for-you", "trending", "following", "latest"].includes(
          options.category.trim().toLowerCase()
        )
      ) {
        const cat = options.category.trim();
        query = query.or(`category.ilike.%${cat}%,tags.cs.{${cat}}`);
      }

      if (options.tag) {
        const cleanTag = options.tag.replace(/^#/, "").trim();
        if (cleanTag) {
          query = query.contains("tags", [cleanTag]);
        }
      }

      if (options.search && options.search.trim()) {
        const q = options.search.trim();
        query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%,category.ilike.%${q}%`);
      }

      const isTrending =
        normalizedTab === "trending" ||
        (options.category && options.category.trim().toLowerCase() === "trending");

      if (isTrending) {
        query = query.order("likes_count", { ascending: false }).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      return query.range(from, to);
    };

    let { data, count, error } = await buildQuery(POST_SELECT_WITH_EXTRAS, true);
    if (error && isMissingColumnError(error)) {
      const fallback = await buildQuery(POST_SELECT_BASE, false);
      data = fallback.data;
      count = fallback.count;
      error = fallback.error;
    }

    if (error) throw new AppError(error.message, 400);

    let posts = (data ?? []) as any[];
    // Enforce followers-only visibility when viewer is not author or follower
    if (posts.some((p) => p.visibility === "followers")) {
      const viewerFollowing = options.userId
        ? new Set(await this.getFollowedUserIds(options.userId))
        : new Set<string>();
      posts = posts.filter(
        (p) =>
          p.visibility !== "followers" ||
          (options.userId && (p.user_id === options.userId || viewerFollowing.has(p.user_id)))
      );
    }

    const hydrated = await hydratePosts(posts, client, options.userId);
    return {
      records: hydrated,
      total: count ?? hydrated.length,
      page,
      limit,
    };
  },

  async getFollowingFeed(userId: string, page = 1, limit = 20) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const followedIds = await this.getFollowedUserIds(userId);

    const feedResult =
      followedIds.length > 0
        ? await this.getPosts({ page, limit, userId, authorIds: followedIds, tab: "latest" })
        : { records: [], total: 0, page, limit };

    // Provide "Who to follow" creator suggestions excluding self and already-followed accounts
    let suggestedUsers: any[] = [];
    try {
      const { data: profiles } = await client
        .from("profiles")
        .select("id, full_name, avatar_url, role, bio")
        .neq("id", userId)
        .in("role", ["tailor", "customer"])
        .limit(12);

      const exclude = new Set([userId, ...followedIds]);
      suggestedUsers = (profiles ?? [])
        .filter((p: any) => !exclude.has(p.id))
        .slice(0, 6)
        .map((p: any) => ({ ...p, isFollowing: false, is_following: false }));
    } catch {
      suggestedUsers = [];
    }

    return {
      ...feedResult,
      followingCount: followedIds.length,
      suggestedUsers,
    };
  },

  async getTrendingPosts(userId?: string, page = 1, limit = 20) {
    const result = await this.getPosts({ page, limit, userId, tab: "trending" });
    const tagCounts = new Map<string, number>();
    for (const post of result.records) {
      if (Array.isArray(post.tags)) {
        for (const tag of post.tags) {
          const clean = String(tag).trim();
          if (clean) tagCounts.set(clean, (tagCounts.get(clean) ?? 0) + 1);
        }
      }
    }

    const trendingTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return {
      ...result,
      trendingTags,
    };
  },

  async getPostById(postId: string, userId?: string) {
    const client = getDbClient();
    const selectFull =
      "id, user_id, title, content, images, tags, category, visibility, likes_count, saves_count, comments_count, created_at, updated_at, author:profiles!user_id(id, full_name, avatar_url, role), comments:community_comments(id, post_id, user_id, content, created_at, user:profiles!user_id(id, full_name, avatar_url, role))";
    const selectBase =
      "id, user_id, title, content, images, tags, category, likes_count, saves_count, created_at, updated_at, author:profiles!user_id(id, full_name, avatar_url, role), comments:community_comments(id, post_id, user_id, content, created_at, user:profiles!user_id(id, full_name, avatar_url, role))";

    let { data, error }: { data: any; error: any } = await client.from("community_posts").select(selectFull).eq("id", postId).single();
    if (error && isMissingColumnError(error)) {
      const fallback = await client.from("community_posts").select(selectBase).eq("id", postId).single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (!data) return null;

    const [hydrated] = await hydratePosts([data], client, userId);
    return hydrated;
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

    const postPayload: Record<string, unknown> = {
      user_id: userId,
      title: mapped.title,
      content: mapped.content,
      images: mapped.images || [],
      tags: mapped.tags || [],
      visibility: (data.visibility as string) || "public",
    };
    if (mapped.category) {
      postPayload.category = mapped.category;
    }

    let { data: created, error } = await client
      .from("community_posts")
      .insert(postPayload)
      .select("*, author:profiles!user_id(*)")
      .single();

    if (error && isMissingColumnError(error)) {
      delete postPayload.visibility;
      const retry = await client
        .from("community_posts")
        .insert(postPayload)
        .select("*, author:profiles!user_id(*)")
        .single();
      created = retry.data;
      error = retry.error;
    }

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

    const allowedColumns = ["title", "content", "images", "tags", "category", "visibility"];
    const updatePayload: Record<string, unknown> = {};
    for (const col of allowedColumns) {
      if (col in mapped) {
        updatePayload[col] = mapped[col];
      }
    }

    const runUpdate = async (payload: Record<string, unknown>) => {
      let query = client.from("community_posts").update(payload).eq("id", postId);
      if (userId && userRole !== "admin") {
        query = query.eq("user_id", userId);
      }
      return query.select().single();
    };

    let { data: updated, error } = await runUpdate(updatePayload);
    if (error && isMissingColumnError(error) && "visibility" in updatePayload) {
      delete updatePayload.visibility;
      const retry = await runUpdate(updatePayload);
      updated = retry.data;
      error = retry.error;
    }

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
