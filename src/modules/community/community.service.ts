import {
  getDbClient,
  toSnakeCase,
  fetchTableData,
  deleteTableData,
} from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";

export const communityService = {
  async getPosts(page = 1, limit = 20) {
    return fetchTableData({
      table: "community_posts",
      select: "*, author:profiles!user_id(*)",
      page,
      limit,
      orderColumn: "created_at",
      ascending: false,
    });
  },

  async getPostById(postId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("community_posts")
      .select("*, author:profiles!user_id(*), comments:community_comments(*, user:profiles!user_id(*))")
      .eq("id", postId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async createPost(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const { data: created, error } = await client
      .from("community_posts")
      .insert({
        ...mapped,
        user_id: userId,
      })
      .select("*, author:profiles!user_id(*)")
      .single();

    if (error) throw new AppError(error.message, 400);
    return created;
  },

  async updatePost(postId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    let query = client.from("community_posts").update(mapped).eq("id", postId);

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
      return { liked: false, post: updated };
    } else {
      await client.from("community_likes").insert({ post_id: postId, user_id: userId });
      const { data: post } = await client.from("community_posts").select("likes_count").eq("id", postId).single();
      const count = (post?.likes_count ?? 0) + 1;
      const { data: updated } = await client.from("community_posts").update({ likes_count: count }).eq("id", postId).select().single();
      return { liked: true, post: updated };
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
      return { saved: false, post: updated };
    } else {
      await client.from("community_saves").insert({ post_id: postId, user_id: userId });
      const { data: post } = await client.from("community_posts").select("saves_count").eq("id", postId).single();
      const count = (post?.saves_count ?? 0) + 1;
      const { data: updated } = await client.from("community_posts").update({ saves_count: count }).eq("id", postId).select().single();
      return { saved: true, post: updated };
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
    const content = (data.content || "") as string;
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
    return created;
  },
};

