import { Prisma } from '../../generated/prisma/client';
import type {
  CreateShopAdminRequestType,
  GetShopsAdminQueryType,
  UpdateShopAdminRequestType,
} from '../dto/request/shop-admin-request';
import type { GetShopsAdminResponse, ShopAdminResponse } from '../dto/response/shop-admin-response';
import { ShopNotFoundError } from '../errors/shop.error';
import type { ShopAdminRecord, ShopAdminRepository } from '../repository/shop-admin.repository';

const isRecordNotFoundError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';

const toResponse = (shop: ShopAdminRecord): ShopAdminResponse => ({
  shopId: shop.id,
  dataSource: shop.dataSource,
  externalStoreId: shop.externalStoreId,
  name: shop.name,
  phoneNumber: shop.phoneNumber,
  address: shop.address,
  addressDetail: shop.addressDetail,
  provinceCode: shop.provinceCode,
  provinceName: shop.provinceName,
  districtCode: shop.districtCode,
  districtName: shop.districtName,
  adminDongCode: shop.adminDongCode,
  adminDongName: shop.adminDongName,
  latitude: shop.latitude.toNumber(),
  longitude: shop.longitude.toNumber(),
  locationGuide: shop.locationGuide,
  parkingInfo: shop.parkingInfo,
  thumbnailImageUrl: shop.thumbnailImageUrl,
  businessHours: shop.businessHours,
  closedDays: shop.closedDays,
  rating: shop.rating.toNumber(),
  reviewCount: shop.reviewCount,
  isDataActive: shop.isDataActive,
  lastSyncedAt: shop.lastSyncedAt,
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt,
});

export class ShopAdminService {
  constructor(private readonly repository: ShopAdminRepository) {}

  async getShops(query: GetShopsAdminQueryType): Promise<GetShopsAdminResponse> {
    const { shops, hasNext } = await this.repository.findMany(
      query.cursor,
      query.limit,
      query.active,
    );
    return {
      shops: shops.map(toResponse),
      nextCursor: hasNext ? (shops.at(-1)?.id ?? null) : null,
      hasNext,
    };
  }

  async getShop(shopId: number): Promise<ShopAdminResponse> {
    const shop = await this.repository.findById(shopId);
    if (!shop) throw new ShopNotFoundError({ shopId });
    return toResponse(shop);
  }

  async createShop(dto: CreateShopAdminRequestType): Promise<ShopAdminResponse> {
    return toResponse(await this.repository.create(dto));
  }

  async updateShop(shopId: number, dto: UpdateShopAdminRequestType): Promise<ShopAdminResponse> {
    try {
      return toResponse(await this.repository.update(shopId, dto));
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new ShopNotFoundError({ shopId });
      throw error;
    }
  }

  async deactivateShop(shopId: number): Promise<ShopAdminResponse> {
    try {
      return toResponse(await this.repository.deactivate(shopId));
    } catch (error) {
      if (isRecordNotFoundError(error)) throw new ShopNotFoundError({ shopId });
      throw error;
    }
  }
}
