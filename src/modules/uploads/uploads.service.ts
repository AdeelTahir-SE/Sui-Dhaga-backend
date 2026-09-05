export const uploadsService = {
  async uploadImage(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    return {
      fileId: `img-${Date.now()}`,
      userId,
      mediaType: "image",
      url: (data.url || data.imageUrl || `https://storage.mock/uploads/${Date.now()}.png`) as string,
      uploadedAt: new Date().toISOString(),
      ...data,
    };
  },

  async uploadImages(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    const urls = (data.urls as string[]) || [];
    return {
      batchId: `batch-${Date.now()}`,
      userId,
      mediaType: "images_batch",
      urls,
      count: urls.length,
      uploadedAt: new Date().toISOString(),
    };
  },

  async uploadFile(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    return {
      fileId: `file-${Date.now()}`,
      userId,
      mediaType: "file",
      url: (data.url || data.fileUrl || `https://storage.mock/uploads/${Date.now()}.pdf`) as string,
      uploadedAt: new Date().toISOString(),
      ...data,
    };
  },

  async deleteUpload(_fileId: string, _userId: string | undefined, _userRole: string | undefined) {
    return true;
  },
};

