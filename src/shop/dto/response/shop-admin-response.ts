import type { JsonValue } from '../../../common/types/json';

export interface ShopAdminResponse {
  shopId: number;
  dataSource: string | null;
  externalStoreId: string | null;
  name: string;
  phoneNumber: string | null;
  address: string;
  addressDetail: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  adminDongCode: string | null;
  adminDongName: string | null;
  latitude: number;
  longitude: number;
  locationGuide: string | null;
  parkingInfo: string | null;
  thumbnailImageUrl: string | null;
  businessHours: JsonValue | null;
  closedDays: JsonValue | null;
  rating: number;
  reviewCount: number;
  isDataActive: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetShopsAdminResponse {
  shops: ShopAdminResponse[];
  nextCursor: number | null;
  hasNext: boolean;
}
