export interface EstimateResponseListItem {
  id: number;
  shop: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    rating: number;
    reviewCount: number;
  };
  totalPrice: number | null;
  distanceMeters: number | null;
  isLowestPrice: boolean;
  isRemovalIncluded: boolean;
  removalPrice: number | null;
  estimatedDurationMinutes: number;
  canProvideService: boolean;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  proposalDateTimes: string[];
  createdAt: string;
}

export interface EstimateResponseListResponse {
  requestId: number;
  // 견적 제목. 예: "8/3 패디 견적"
  title: string | null;
  responses: EstimateResponseListItem[];
  waitingShops: Array<{
    shopId: number;
    name: string;
    averageResponseMinutes: number;
    expectedResponseMinutes: number;
  }>;
}
