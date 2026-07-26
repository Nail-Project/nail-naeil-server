import { getPrisma } from '../../infra/prisma';

export interface ExternalShopData {
  externalStoreId: string;
  name: string;
  address: string;
  provinceCode: string | null;
  provinceName: string | null;
  districtCode: string | null;
  districtName: string | null;
  adminDongCode: string | null;
  adminDongName: string | null;
  latitude: number;
  longitude: number;
  syncedAt: Date;
}

export interface ShopRepository {
  upsertExternalShops(shops: ExternalShopData[]): Promise<number>;
}

export class PrismaShopRepository implements ShopRepository {
  async upsertExternalShops(shops: ExternalShopData[]): Promise<number> {
    if (shops.length === 0) {
      return 0;
    }

    const prisma = getPrisma();
    await prisma.$transaction(
      shops.map((shop) =>
        prisma.shop.upsert({
          where: {
            dataSource_externalStoreId: {
              dataSource: 'SBIZ',
              externalStoreId: shop.externalStoreId,
            },
          },
          create: {
            dataSource: 'SBIZ',
            externalStoreId: shop.externalStoreId,
            name: shop.name,
            address: shop.address,
            provinceCode: shop.provinceCode,
            provinceName: shop.provinceName,
            districtCode: shop.districtCode,
            districtName: shop.districtName,
            adminDongCode: shop.adminDongCode,
            adminDongName: shop.adminDongName,
            latitude: shop.latitude,
            longitude: shop.longitude,
            isDataActive: true,
            lastSyncedAt: shop.syncedAt,
          },
          update: {
            name: shop.name,
            address: shop.address,
            provinceCode: shop.provinceCode,
            provinceName: shop.provinceName,
            districtCode: shop.districtCode,
            districtName: shop.districtName,
            adminDongCode: shop.adminDongCode,
            adminDongName: shop.adminDongName,
            latitude: shop.latitude,
            longitude: shop.longitude,
            isDataActive: true,
            lastSyncedAt: shop.syncedAt,
          },
        }),
      ),
    );

    return shops.length;
  }
}
