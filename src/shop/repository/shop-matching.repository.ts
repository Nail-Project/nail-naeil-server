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
  averagePrice: number | null;
}

export interface ShopMatchingRepository {
  findNearbyShops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyShopRecord[]>;
  findCheapShops(
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
  averagePrice: number | null;
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
        , NULL AS averagePrice
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
      averagePrice: shop.averagePrice === null ? null : Math.round(Number(shop.averagePrice)),
    }));
  }

  async findCheapShops(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    limit: number,
  ): Promise<NearbyShopRecord[]> {
    const shops = await getPrisma().$queryRaw<RawNearbyShop[]>`
      SELECT
        s.id AS shopId,
        s.name,
        s.phone_number AS phoneNumber,
        s.address,
        s.address_detail AS addressDetail,
        s.latitude,
        s.longitude,
        ST_Distance_Sphere(POINT(s.longitude, s.latitude), POINT(${longitude}, ${latitude})) AS distanceMeters,
        AVG(CASE WHEN er.can_provide_service = TRUE AND er.total_price IS NOT NULL THEN er.total_price END) AS averagePrice
      FROM shops s
      LEFT JOIN estimate_responses er ON er.shop_id = s.id
      WHERE s.is_data_active = TRUE
        AND ST_Distance_Sphere(POINT(s.longitude, s.latitude), POINT(${longitude}, ${latitude})) <= ${radiusMeters}
      GROUP BY s.id, s.name, s.phone_number, s.address, s.address_detail, s.latitude, s.longitude
      ORDER BY averagePrice IS NULL ASC, averagePrice ASC, distanceMeters ASC, s.id ASC
      LIMIT ${limit}
    `;

    return shops.map((shop) => ({
      ...shop,
      latitude: Number(shop.latitude),
      longitude: Number(shop.longitude),
      distanceMeters: Math.round(Number(shop.distanceMeters)),
      averagePrice: shop.averagePrice === null ? null : Math.round(Number(shop.averagePrice)),
    }));
  }
}
