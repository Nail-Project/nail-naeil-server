// POST /api/v1/estimate-request - 견적 요청 생성 성공 시 Response
export interface CreateEstimateResponseDto {
  estimateId: number;
  nailType: string;
  removalType: string;
  startDate: Date;
  endDate: Date;
  preferredTime: string;
  recommendType: string;
  description: string | null;
  status: string;
  designId: number | null;
  // 요청에 첨부된 디자인 이미지 목록
  images: { imageId: number; imageUrl: string }[];
  createdAt: Date;
}
