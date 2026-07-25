import type { GetShopListRequest } from '../dto/request/get-shop-list-request';
import type { SearchShopRequest } from '../dto/request/search-shop-request';
import type {
  ShopDetailResponse,
  ShopListResponse,
  ShopSummaryResponse,
} from '../dto/response/shop-query-response';
import { ShopNotFoundError } from '../errors/shop.error';
import type { ShopQueryRepository, ShopSummaryRecord } from '../repository/shop-query.repository';

export class ShopQueryService {
  constructor(private readonly repository: ShopQueryRepository) {}

  async getList(request: GetShopListRequest): Promise<ShopListResponse> {
    return this.toListResponse(
      await this.repository.findList(request.limit, request.cursor),
      request.limit,
    );
  }

  async search(request: SearchShopRequest): Promise<ShopListResponse> {
    return this.toListResponse(
      await this.repository.search(request.keyword, request.limit, request.cursor),
      request.limit,
    );
  }

  async getDetail(shopId: number): Promise<ShopDetailResponse> {
    const shop = await this.repository.findDetail(shopId);
    if (!shop) {
      throw new ShopNotFoundError({ shopId });
    }

    return {
      ...this.toSummaryResponse(shop),
      phoneNumber: shop.phoneNumber,
      provinceName: shop.provinceName,
      locationGuide: shop.locationGuide,
      parkingInfo: shop.parkingInfo,
    };
  }

  private toListResponse(records: ShopSummaryRecord[], limit: number): ShopListResponse {
    const hasNext = records.length > limit;
    const page = hasNext ? records.slice(0, limit) : records;

    return {
      shops: page.map((shop) => this.toSummaryResponse(shop)),
      nextCursor: hasNext ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toSummaryResponse(shop: ShopSummaryRecord): ShopSummaryResponse {
    return {
      shopId: shop.id,
      name: shop.name,
      address: shop.address,
      addressDetail: shop.addressDetail,
      districtName: shop.districtName,
      adminDongName: shop.adminDongName,
      latitude: shop.latitude.toNumber(),
      longitude: shop.longitude.toNumber(),
    };
  }
}
