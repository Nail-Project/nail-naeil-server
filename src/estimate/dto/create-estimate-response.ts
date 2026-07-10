export interface CreateEstimateResponse {
  estimateId: number;
  nailType: string;
  removalType: string;
  startDate: Date;
  endDate: Date;
  preferredTime: string;
  recommendType: string;
  description: string | null;
  status: string;
  images: { imageId: number; imageUrl: string }[];
  createdAt: Date;
}
