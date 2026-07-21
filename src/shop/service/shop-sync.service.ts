import type { SbizShopClient, SbizShopItem } from '../../external/sbiz/sbiz-shop.client';
import type { SyncShopRequest } from '../dto/request/sync-shop-request';
import type { SyncShopResponse } from '../dto/response/sync-shop-response';
import type { ExternalShopData, ShopRepository } from '../repository/shop.repository';

export class ShopSyncService {
  constructor(
    private readonly client: SbizShopClient,
    private readonly repository: ShopRepository,
  ) {}

  async sync(request: SyncShopRequest): Promise<SyncShopResponse> {
    let fetchedCount = 0;
    let savedCount = 0;
    let skippedCount = 0;
    let processedPages = 0;

    for (let pageNo = 1; pageNo <= request.maxPages; pageNo += 1) {
      const page = await this.client.getShopsByIndustry(
        request.industryCode,
        pageNo,
        request.pageSize,
      );
      processedPages += 1;
      fetchedCount += page.items.length;

      const mapped = page.items
        .map((item) => this.mapItem(item, request.industryCode))
        .filter((shop): shop is ExternalShopData => shop !== null);

      skippedCount += page.items.length - mapped.length;
      savedCount += await this.repository.upsertExternalShops(mapped);

      if (page.items.length === 0 || pageNo * request.pageSize >= page.totalCount) {
        break;
      }
    }

    return {
      requestedIndustryCode: request.industryCode,
      fetchedCount,
      savedCount,
      skippedCount,
      processedPages,
    };
  }

  private mapItem(item: SbizShopItem, industryCode: string): ExternalShopData | null {
    const externalStoreId = item.bizesId?.trim();
    const name = item.bizesNm?.trim();
    const address = item.rdnmAdr?.trim() || item.lnoAdr?.trim();
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);

    if (
      !externalStoreId ||
      !name ||
      !address ||
      item.indsSclsCd !== industryCode ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return {
      externalStoreId,
      name,
      address,
      provinceCode: item.ctprvnCd?.trim() || null,
      provinceName: item.ctprvnNm?.trim() || null,
      districtCode: item.signguCd?.trim() || null,
      districtName: item.signguNm?.trim() || null,
      adminDongCode: item.adongCd?.trim() || null,
      adminDongName: item.adongNm?.trim() || null,
      latitude,
      longitude,
      syncedAt: new Date(),
    };
  }
}
