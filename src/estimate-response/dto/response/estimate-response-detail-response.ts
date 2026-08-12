export interface EstimateResponseDetailResponse {
  id: number;
  requestId: number;
  // 견적 제목. 예: "8/3 패디 견적"
  title: string | null;
  shop: {
    id: number;
    name: string;
    phoneNumber: string | null;
    address: string;
    addressDetail: string | null;
    latitude: number;
    longitude: number;
    rating: number;
    reviewCount: number;
    businessHours: unknown;
    closedDays: unknown;
  };
  price: {
    totalPrice: number | null;
    basePrice: number | null;
    removalPrice: number | null;
    designExtraPrice: number | null;
    optionExtraPrice: number | null;
  };
  memo: string | null;
  estimatedDurationMinutes: number;
  canProvideService: boolean;
  isRemovalIncluded: boolean;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  proposalDateTimes: string[];
  createdAt: string;
}
