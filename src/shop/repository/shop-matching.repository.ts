import { Prisma } from '../../generated/prisma/client';
import { getPrisma } from '../../infra/prisma';

export interface NearbyShopRecord {
  shopId: number;
  name: string;
  phoneNumber: string | null;
  address: string;
  addressDetail: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface ShopMatchingRepository {
  findNearbyShops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyShopRecord[]>;
}

interface RawNearbyShop {
  shopId: number;
  name: string;
  phoneNumber: string | null;
  address: string;
  addressDetail: string | null;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  distanceMeters: number;
}

export class PrismaShopMatchingRepository implements ShopMatchingRepository {
  async findNearbyShops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyShopRecord[]> {
    const shops = await getPrisma().$queryRaw<RawNearbyShop[]>`
      SELECT
        id AS shopId,
        name,
        phone_number AS phoneNumber,
        address,
        address_detail AS addressDetail,
        latitude,
        longitude,
        ST_Distance_Sphere(
          POINT(longitude, latitude),
          POINT(${longitude}, ${latitude})
        ) AS distanceMeters
      FROM shops
      WHERE is_data_active = TRUE
        AND ST_Distance_Sphere(
          POINT(longitude, latitude),
          POINT(${longitude}, ${latitude})
        ) <= ${radiusMeters}
      ORDER BY distanceMeters ASC, id ASC
      LIMIT ${limit}
    `;

    return shops.map((shop) => ({
      ...shop,
      latitude: Number(shop.latitude),
      longitude: Number(shop.longitude),
      distanceMeters: Math.round(Number(shop.distanceMeters)),
    }));
  }
}
