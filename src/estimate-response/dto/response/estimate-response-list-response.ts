export interface EstimateResponseListItem {
  id: number;
  shop: {
    id: number;
    name: string;
    address: string;
  };
  totalPrice: number;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  proposalDateTimes: string[];
  createdAt: string;
}

export interface EstimateResponseListResponse {
  requestId: number;
  responses: EstimateResponseListItem[];
}
