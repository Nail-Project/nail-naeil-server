// GET /api/v1/estimate/result/:request_id - 견적 결과 상세 조회 성공 시 Response
export interface ProposalTimeItem {
  timeId: number;
  proposalDatetime: Date | null;
  isSelected: boolean | null;
}

export interface ProposalItem {
  proposalId: number;
  shopId: number;
  shopName: string;
  rating: number | null;
  reviewCount: number | null;
  distance: number | null;
  totalPrice: number | null;
  isRemovalIncluded: boolean;
  basePrice: number | null;
  removalPrice: number | null;
  extraPrice: number | null;
  memo: string | null;
  status: string;
  times: ProposalTimeItem[];
}

export interface ResultEstimateResponse {
  requestId: number;
  proposals: ProposalItem[];
}
