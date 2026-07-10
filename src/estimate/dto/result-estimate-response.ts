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
