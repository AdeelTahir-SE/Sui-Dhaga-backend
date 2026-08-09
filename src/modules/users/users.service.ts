import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const usersService = {
  async getMyProfile(userId: string, userRole?: string) {
    const { singleRecord } = await fetchResources({
      resourceType: "profiles",
      id: userId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async updateMyProfile(userId: string, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "profiles",
      id: userId,
      userId,
      userRole,
      data,
    });
  },

  async updateAvatar(userId: string, userRole: string | undefined, avatarUrl: string) {
    return saveResource({
      resourceType: "profiles",
      id: userId,
      userId,
      userRole,
      data: { avatar_url: avatarUrl },
    });
  },

  async deleteMyProfile(userId: string, userRole?: string) {
    return deleteResource({
      resourceType: "profiles",
      id: userId,
      userId,
      userRole,
    });
  },

  async getUserById(userId: string, currentUserId?: string, userRole?: string) {
    const { singleRecord } = await fetchResources({
      resourceType: "profiles",
      id: userId,
      userId: currentUserId,
      userRole,
    });
    return singleRecord;
  },
};
