import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const tailorsService = {
  async getTailors(page?: number, limit?: number) {
    const result = await fetchResources({
      resourceType: "tailors",
      isPublic: true,
      page,
      limit,
    });
    return result;
  },

  async getTailorById(tailorId: string) {
    const { singleRecord } = await fetchResources({
      resourceType: "tailors",
      id: tailorId,
      isPublic: true,
    });
    return singleRecord;
  },

  async createTailor(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "tailors",
      userId,
      userRole,
      data,
    });
  },

  async updateTailor(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "tailors",
      id: tailorId,
      userId,
      userRole,
      data,
    });
  },

  async deleteTailor(tailorId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "tailors",
      id: tailorId,
      userId,
      userRole,
    });
  },

  async getTailorServices(tailorId: string) {
    const { records } = await fetchResources({
      resourceType: `tailors_services_${tailorId}`,
      isPublic: true,
    });
    return records;
  },

  async addTailorService(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: `tailors_services_${tailorId}`,
      userId,
      userRole,
      data,
    });
  },

  async updateTailorService(serviceId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "tailor_services",
      id: serviceId,
      userId,
      userRole,
      data,
    });
  },

  async deleteTailorService(serviceId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "tailor_services",
      id: serviceId,
      userId,
      userRole,
    });
  },

  async getTailorAvailability(tailorId: string) {
    const { records } = await fetchResources({
      resourceType: `tailors_availability_${tailorId}`,
      isPublic: true,
    });
    return records;
  },

  async addTailorAvailability(tailorId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: `tailors_availability_${tailorId}`,
      userId,
      userRole,
      data,
    });
  },

  async updateAvailabilitySlot(slotId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "availability",
      id: slotId,
      userId,
      userRole,
      data,
    });
  },

  async deleteAvailabilitySlot(slotId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "availability",
      id: slotId,
      userId,
      userRole,
    });
  },
};
