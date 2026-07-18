export interface EstimateResponseDetailResponse {
  id: number;
  requestId: number;
  shop: {
    id: number;
    name: string;
    phoneNumber: string | null;
    address: string;
    addressDetail: string | null;
  };
  price: {
    totalPrice: number;
    basePrice: number;
    removalPrice: number;
    extraPrice: number;
  };
  memo: string | null;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
  proposalDateTimes: string[];
  createdAt: string;
}
