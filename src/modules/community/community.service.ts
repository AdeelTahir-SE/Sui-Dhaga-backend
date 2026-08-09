import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const communityService = {
  async getPosts(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "community_posts",
      isPublic: true,
      page,
      limit,
    });
  },

  async getPostById(postId: string) {
    const { singleRecord } = await fetchResources({
      resourceType: "community_posts",
      id: postId,
      isPublic: true,
    });
    return singleRecord;
  },

  async createPost(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "community_posts",
      userId,
      userRole,
      data,
    });
  },

  async updatePost(postId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "community_posts",
      id: postId,
      userId,
      userRole,
      data,
    });
  },

  async deletePost(postId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "community_posts",
      id: postId,
      userId,
      userRole,
    });
  },

  async toggleLike(postId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "community_posts",
      id: postId,
      userId,
      userRole,
      data: { liked: true },
    });
  },

  async toggleSave(postId: string, userId: string | undefined, userRole: string | undefined) {
    return saveResource({
      resourceType: "community_posts",
      id: postId,
      userId,
      userRole,
      data: { saved: true },
    });
  },

  async getComments(postId: string) {
    const { records } = await fetchResources({
      resourceType: `community_post_comments_${postId}`,
      isPublic: true,
    });
    return records;
  },

  async addComment(postId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: `community_post_comments_${postId}`,
      userId,
      userRole,
      data,
    });
  },
};
