export interface EstimateResponseDetailResponse {
  id: number;
  requestId: number;
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
    totalPrice: number;
    basePrice: number | null;
    removalPrice: number | null;
    extraPrice: number | null;
  };
  memo: string | null;
  estimatedDurationMinutes: number;
  canProvideService: boolean;
  isRemovalIncluded: boolean;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  proposalDateTimes: string[];
  createdAt: string;
}
