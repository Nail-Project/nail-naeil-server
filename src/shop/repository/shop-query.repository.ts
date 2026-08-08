import type { Prisma } from '../../generated/prisma/client';
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
  thumbnailImageUrl: string | null;
  businessHours: Prisma.JsonValue | null;
  closedDays: Prisma.JsonValue | null;
  rating: { toNumber(): number };
  reviewCount: number;
  wishes: { id: number }[];
}

export interface ShopDetailRecord extends ShopSummaryRecord {
  phoneNumber: string | null;
  provinceName: string | null;
  locationGuide: string | null;
  parkingInfo: string | null;
}

export interface ShopQueryRepository {
  findList(userId: number, limit: number, cursor?: number): Promise<ShopSummaryRecord[]>;
  search(
    userId: number,
    keyword: string,
    limit: number,
    cursor?: number,
  ): Promise<ShopSummaryRecord[]>;
  findDetail(shopId: number, userId: number): Promise<ShopDetailRecord | null>;
  exists(shopId: number): Promise<boolean>;
  createWish(shopId: number, userId: number): Promise<void>;
  deleteWish(shopId: number, userId: number): Promise<void>;
  findWishlist(
    userId: number,
    limit: number,
    cursor?: number,
  ): Promise<Array<{ id: number; shop: ShopSummaryRecord }>>;
  findReviews(shopId: number, limit: number, cursor?: number): Promise<ShopReviewRecord[]>;
}

export interface ShopReviewRecord {
  id: number;
  rating: number;
  content: string | null;
  createdAt: Date;
  user: { nickname: string | null; profileImageUrl: string | null };
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
  thumbnailImageUrl: true,
  businessHours: true,
  closedDays: true,
  rating: true,
  reviewCount: true,
};

const summarySelectForUser = (userId: number) => ({
  ...shopSummarySelect,
  wishes: { where: { userId }, select: { id: true }, take: 1 },
});

export class PrismaShopQueryRepository implements ShopQueryRepository {
  async findList(userId: number, limit: number, cursor?: number): Promise<ShopSummaryRecord[]> {
    return getPrisma().shop.findMany({
      where: { isDataActive: true },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { id: 'asc' },
      select: summarySelectForUser(userId),
    });
  }

  async search(
    userId: number,
    keyword: string,
    limit: number,
    cursor?: number,
  ): Promise<ShopSummaryRecord[]> {
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
      select: summarySelectForUser(userId),
    });
  }

  async findDetail(shopId: number, userId: number): Promise<ShopDetailRecord | null> {
    return getPrisma().shop.findFirst({
      where: { id: shopId, isDataActive: true },
      select: {
        ...summarySelectForUser(userId),
        phoneNumber: true,
        provinceName: true,
        locationGuide: true,
        parkingInfo: true,
      },
    });
  }

  async exists(shopId: number): Promise<boolean> {
    return (await getPrisma().shop.count({ where: { id: shopId, isDataActive: true } })) > 0;
  }

  async createWish(shopId: number, userId: number): Promise<void> {
    await getPrisma().wishShop.upsert({
      where: { shopId_userId: { shopId, userId } },
      create: { shopId, userId },
      update: {},
    });
  }

  async deleteWish(shopId: number, userId: number): Promise<void> {
    await getPrisma().wishShop.deleteMany({ where: { shopId, userId } });
  }

  async findWishlist(
    userId: number,
    limit: number,
    cursor?: number,
  ): Promise<Array<{ id: number; shop: ShopSummaryRecord }>> {
    return getPrisma().wishShop.findMany({
      where: { userId, shop: { isDataActive: true } },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, shop: { select: summarySelectForUser(userId) } },
    });
  }

  async findReviews(shopId: number, limit: number, cursor?: number): Promise<ShopReviewRecord[]> {
    return getPrisma().shopReview.findMany({
      where: { shopId },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        rating: true,
        content: true,
        createdAt: true,
        user: { select: { nickname: true, profileImageUrl: true } },
      },
    });
  }
}
