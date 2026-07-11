// GET /api/v1/estimate/:proposal_id/detail - 샵 견적 상세 조회 성공 시 Response

export interface ProposalDetailTimeItem {
  timeId: number;
  proposalDatetime: Date | null;
  isSelected: boolean | null;
}

export interface ProposalDetailImageItem {
  imageId: number;
  imageUrl: string;
}

export interface ProposalDetailResponse {
  proposalId: number;
  shopName: string;
  rating: number | null;
  reviewCount: number | null;
  totalPrice: number | null;
  basePrice: number | null;
  removalPrice: number | null;
  extraPrice: number | null;
  memo: string | null;
  times: ProposalDetailTimeItem[];
  designImages: ProposalDetailImageItem[];
  address: string;
  locationGuide: string | null;
  parkingInfo: string | null;
}
