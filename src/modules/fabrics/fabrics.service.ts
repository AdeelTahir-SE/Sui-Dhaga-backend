import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const fabricsService = {
  async getFabrics(page?: number, limit?: number) {
    return fetchResources({
      resourceType: "fabrics",
      isPublic: true,
      page,
      limit,
    });
  },

  async getFabricById(fabricId: string) {
    const { singleRecord } = await fetchResources({
      resourceType: "fabrics",
      id: fabricId,
      isPublic: true,
    });
    return singleRecord;
  },

  async createFabric(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "fabrics",
      userId,
      userRole,
      data,
    });
  },

  async updateFabric(fabricId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "fabrics",
      id: fabricId,
      userId,
      userRole,
      data,
    });
  },

  async deleteFabric(fabricId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "fabrics",
      id: fabricId,
      userId,
      userRole,
    });
  },
};
