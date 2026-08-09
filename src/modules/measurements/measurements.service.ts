import {
  fetchResources,
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const measurementsService = {
  async getMeasurements(userId: string | undefined, userRole: string | undefined, page?: number, limit?: number) {
    return fetchResources({
      resourceType: "measurements",
      userId,
      userRole,
      page,
      limit,
    });
  },

  async getMeasurementById(measurementId: string, userId: string | undefined, userRole: string | undefined) {
    const { singleRecord } = await fetchResources({
      resourceType: "measurements",
      id: measurementId,
      userId,
      userRole,
    });
    return singleRecord;
  },

  async createMeasurement(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "measurements",
      userId,
      userRole,
      data,
    });
  },

  async updateMeasurement(measurementId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "measurements",
      id: measurementId,
      userId,
      userRole,
      data,
    });
  },

  async deleteMeasurement(measurementId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "measurements",
      id: measurementId,
      userId,
      userRole,
    });
  },
};
