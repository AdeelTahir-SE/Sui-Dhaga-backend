export interface TextToDesignPayload {
  prompt: string;
  category?: string;
  fabricPreference?: string;
  colorPreference?: string;
}

export interface ImageToDesignPayload {
  imageUrl: string;
  instructions?: string;
}

export interface SketchToDesignPayload {
  sketchUrl: string;
  instructions?: string;
}

export interface DesignChatPayload {
  message: string;
  designId?: string;
}

export interface UpdateDesignPayload {
  title?: string;
  description?: string;
  prompt?: string;
  imageUrl?: string;
  colors?: string[];
  fabric?: string;
  embroidery?: string;
  measurements?: Record<string, number>;
  notes?: string;
}

export interface ShareDesignPayload {
  tailorId: string;
}
