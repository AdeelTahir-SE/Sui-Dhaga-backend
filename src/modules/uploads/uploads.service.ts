import {
  saveResource,
  deleteResource,
} from "../../utils/resource-helper.js";

export const uploadsService = {
  async uploadImage(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "uploads",
      userId,
      userRole,
      data: { ...data, mediaType: "image" },
    });
  },

  async uploadImages(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "uploads",
      userId,
      userRole,
      data: { ...data, mediaType: "images_batch" },
    });
  },

  async uploadFile(userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    return saveResource({
      resourceType: "uploads",
      userId,
      userRole,
      data: { ...data, mediaType: "file" },
    });
  },

  async deleteUpload(fileId: string, userId: string | undefined, userRole: string | undefined) {
    return deleteResource({
      resourceType: "uploads",
      id: fileId,
      userId,
      userRole,
    });
  },
};
