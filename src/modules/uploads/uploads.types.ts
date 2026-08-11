export interface UploadImagePayload {
  image: string;
  folder?: string;
}

export interface UploadImagesPayload {
  images: string[];
  folder?: string;
}

export interface UploadFilePayload {
  file: string;
  fileName?: string;
  folder?: string;
}
