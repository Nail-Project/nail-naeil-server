export interface MatchedShopResponse {
  shopId: number;
  name: string;
  phoneNumber: string | null;
  address: string;
  addressDetail: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}
