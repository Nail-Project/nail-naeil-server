// GET /api/v1/estimate/:status - 상태별 견적 목록 조회 성공 시 Response
export interface GetEstimatesResponse {
  estimateId: number;
  thumbnailUrl: string | null;
  nailType: string;
  createdAt: Date;
  status: string;
  proposalCount: number;
  pendingShopCount: number;
  minPrice: number | null;
}
