export interface ShopSummaryResponse {
  shopId: number;
  name: string;
  address: string;
  addressDetail: string | null;
  districtName: string | null;
  adminDongName: string | null;
  latitude: number;
  longitude: number;
  thumbnailImageUrl: string | null;
  businessHours: unknown;
  closedDays: unknown;
  rating: number;
  reviewCount: number;
  distanceMeters: number | null;
  isWished: boolean;
}

export interface ShopWishResponse {
  shopId: number;
  isWished: boolean;
}

export interface ShopReviewListResponse {
  reviews: Array<{
    reviewId: number;
    nickname: string | null;
    profileImageUrl: string | null;
    rating: number;
    content: string | null;
    createdAt: string;
  }>;
  nextCursor: number | null;
}

export interface ShopListResponse {
  shops: ShopSummaryResponse[];
  nextCursor: number | null;
}

export interface ShopDetailResponse extends ShopSummaryResponse {
  phoneNumber: string | null;
  provinceName: string | null;
  locationGuide: string | null;
  parkingInfo: string | null;
}
