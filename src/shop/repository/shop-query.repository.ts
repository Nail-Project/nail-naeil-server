import { getPrisma } from '../../infra/prisma';

export interface ShopSummaryRecord {
  id: number;
  name: string;
  address: string;
  addressDetail: string | null;
  districtName: string | null;
  adminDongName: string | null;
  latitude: { toNumber(): number };
  longitude: { toNumber(): number };
}

export interface ShopDetailRecord extends ShopSummaryRecord {
  phoneNumber: string | null;
  provinceName: string | null;
  locationGuide: string | null;
  parkingInfo: string | null;
}

export interface ShopQueryRepository {
  findList(limit: number, cursor?: number): Promise<ShopSummaryRecord[]>;
  search(keyword: string, limit: number, cursor?: number): Promise<ShopSummaryRecord[]>;
  findDetail(shopId: number): Promise<ShopDetailRecord | null>;
}

const shopSummarySelect = {
  id: true,
  name: true,
  address: true,
  addressDetail: true,
  districtName: true,
  adminDongName: true,
  latitude: true,
  longitude: true,
};

export class PrismaShopQueryRepository implements ShopQueryRepository {
  async findList(limit: number, cursor?: number): Promise<ShopSummaryRecord[]> {
    return getPrisma().shop.findMany({
      where: { isDataActive: true },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: shopSummarySelect,
    });
  }

  async search(keyword: string, limit: number, cursor?: number): Promise<ShopSummaryRecord[]> {
    return getPrisma().shop.findMany({
      where: {
        isDataActive: true,
        OR: [
          { name: { contains: keyword } },
          { address: { contains: keyword } },
          { addressDetail: { contains: keyword } },
        ],
      },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: shopSummarySelect,
    });
  }

  async findDetail(shopId: number): Promise<ShopDetailRecord | null> {
    return getPrisma().shop.findFirst({
      where: { id: shopId, isDataActive: true },
      select: {
        ...shopSummarySelect,
        phoneNumber: true,
        provinceName: true,
        locationGuide: true,
        parkingInfo: true,
      },
    });
  }
}
