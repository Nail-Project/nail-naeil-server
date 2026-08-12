import { Prisma } from '../../generated/prisma/client';
import { getPrisma } from '../../infra/prisma';
import type {
  CreateShopAdminRequestType,
  UpdateShopAdminRequestType,
} from '../dto/request/shop-admin-request';

const shopAdminSelect = {
  id: true,
  dataSource: true,
  externalStoreId: true,
  name: true,
  phoneNumber: true,
  address: true,
  addressDetail: true,
  provinceCode: true,
  provinceName: true,
  districtCode: true,
  districtName: true,
  adminDongCode: true,
  adminDongName: true,
  latitude: true,
  longitude: true,
  locationGuide: true,
  parkingInfo: true,
  thumbnailImageUrl: true,
  businessHours: true,
  closedDays: true,
  rating: true,
  reviewCount: true,
  isDataActive: true,
  lastSyncedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type ShopAdminRecord = Prisma.ShopGetPayload<{ select: typeof shopAdminSelect }>;

const toJsonInput = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value === null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

const toShopWriteData = <T extends CreateShopAdminRequestType | UpdateShopAdminRequestType>(
  data: T,
) => {
  const { businessHours, closedDays, ...fields } = data;
  return {
    ...fields,
    ...(businessHours !== undefined && { businessHours: toJsonInput(businessHours) }),
    ...(closedDays !== undefined && { closedDays: toJsonInput(closedDays) }),
  };
};

export interface ShopAdminRepository {
  findMany(
    cursor: number | undefined,
    limit: number,
    active: 'true' | 'false' | 'all',
  ): Promise<{ shops: ShopAdminRecord[]; hasNext: boolean }>;
  findById(shopId: number): Promise<ShopAdminRecord | null>;
  create(data: CreateShopAdminRequestType): Promise<ShopAdminRecord>;
  update(shopId: number, data: UpdateShopAdminRequestType): Promise<ShopAdminRecord>;
  deactivate(shopId: number): Promise<ShopAdminRecord>;
}

export class PrismaShopAdminRepository implements ShopAdminRepository {
  async findMany(cursor: number | undefined, limit: number, active: 'true' | 'false' | 'all') {
    const rows = await getPrisma().shop.findMany({
      where: {
        ...(cursor && { id: { lt: cursor } }),
        ...(active !== 'all' && { isDataActive: active === 'true' }),
      },
      select: shopAdminSelect,
      orderBy: { id: 'desc' },
      take: limit + 1,
    });
    const hasNext = rows.length > limit;
    return { shops: hasNext ? rows.slice(0, limit) : rows, hasNext };
  }

  findById(shopId: number) {
    return getPrisma().shop.findUnique({ where: { id: shopId }, select: shopAdminSelect });
  }

  create(data: CreateShopAdminRequestType) {
    return getPrisma().shop.create({
      data: { ...toShopWriteData(data), dataSource: 'ADMIN', isDataActive: true },
      select: shopAdminSelect,
    });
  }

  update(shopId: number, data: UpdateShopAdminRequestType) {
    return getPrisma().shop.update({
      where: { id: shopId },
      data: toShopWriteData(data),
      select: shopAdminSelect,
    });
  }

  deactivate(shopId: number) {
    return getPrisma().shop.update({
      where: { id: shopId },
      data: { isDataActive: false },
      select: shopAdminSelect,
    });
  }
}
