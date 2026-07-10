// POST /api/v1/estimate - 견적 요청 생성 성공 시 Response
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
