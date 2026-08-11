export interface CreateFabricPayload {
  name: string;
  material: string;
  pricePerMeter: number;
  color?: string;
  pattern?: string;
  imageUrl?: string;
  inStock?: boolean;
}

export interface UpdateFabricPayload extends Partial<CreateFabricPayload> {}
