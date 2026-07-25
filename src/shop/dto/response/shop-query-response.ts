export interface ShopSummaryResponse {
  shopId: number;
  name: string;
  address: string;
  addressDetail: string | null;
  districtName: string | null;
  adminDongName: string | null;
  latitude: number;
  longitude: number;
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
