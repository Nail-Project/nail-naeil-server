import type { GetShopListRequest } from '../dto/request/get-shop-list-request';
import type { SearchShopRequest } from '../dto/request/search-shop-request';
import type {
  ShopDetailResponse,
  ShopListResponse,
  ShopReviewListResponse,
  ShopSummaryResponse,
  ShopWishResponse,
} from '../dto/response/shop-query-response';
import { ShopNotFoundError } from '../errors/shop.error';
import type { ShopQueryRepository, ShopSummaryRecord } from '../repository/shop-query.repository';

export class ShopQueryService {
  constructor(private readonly repository: ShopQueryRepository) {}

  async getList(request: GetShopListRequest, userId: number): Promise<ShopListResponse> {
    return this.toListResponse(
      await this.repository.findList(userId, request.limit, request.cursor),
      request.limit,
      request.latitude,
      request.longitude,
    );
  }

  async search(request: SearchShopRequest, userId: number): Promise<ShopListResponse> {
    return this.toListResponse(
      await this.repository.search(userId, request.keyword, request.limit, request.cursor),
      request.limit,
      request.latitude,
      request.longitude,
    );
  }

  async getDetail(
    shopId: number,
    userId: number,
    latitude?: number,
    longitude?: number,
  ): Promise<ShopDetailResponse> {
    const shop = await this.repository.findDetail(shopId, userId);
    if (!shop) {
      throw new ShopNotFoundError({ shopId });
    }

    return {
      ...this.toSummaryResponse(shop, latitude, longitude),
      phoneNumber: shop.phoneNumber,
      provinceName: shop.provinceName,
      locationGuide: shop.locationGuide,
      parkingInfo: shop.parkingInfo,
    };
  }

  // 찜 추가/해제를 하나의 호출로 처리한다. "현재 상태를 조회 후 반대로 분기"하면
  // 동시 요청 사이에 TOCTOU 레이스가 생길 수 있어서(CodeRabbit 리뷰 반영, 2026-08-09),
  // 대신 삭제를 먼저 시도해 실제로 지워진 row가 있었는지(deleteMany의 원자적 count)로
  // 분기한다 - 별도 조회 없이 단일 쿼리 결과만으로 상태를 판단한다.
  async toggleWish(shopId: number, userId: number): Promise<ShopWishResponse> {
    if (!(await this.repository.exists(shopId))) throw new ShopNotFoundError({ shopId });

    const wasWished = await this.repository.deleteWish(shopId, userId);
    if (wasWished) return { shopId, isWished: false };

    await this.repository.createWish(shopId, userId);
    return { shopId, isWished: true };
  }

  async getWishlist(
    userId: number,
    limit: number,
    cursor?: number,
    latitude?: number,
    longitude?: number,
  ): Promise<ShopListResponse> {
    const rows = await this.repository.findWishlist(userId, limit, cursor);
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    return {
      shops: page.map(({ shop }) => this.toSummaryResponse(shop, latitude, longitude)),
      nextCursor: hasNext ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async getReviews(
    shopId: number,
    limit: number,
    cursor?: number,
  ): Promise<ShopReviewListResponse> {
    if (!(await this.repository.exists(shopId))) throw new ShopNotFoundError({ shopId });
    const rows = await this.repository.findReviews(shopId, limit, cursor);
    const hasNext = rows.length > limit;
    const page = hasNext ? rows.slice(0, limit) : rows;
    return {
      reviews: page.map((review) => ({
        reviewId: review.id,
        nickname: review.user.nickname,
        profileImageUrl: review.user.profileImageUrl,
        rating: review.rating,
        content: review.content,
        createdAt: review.createdAt.toISOString(),
      })),
      nextCursor: hasNext ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toListResponse(
    records: ShopSummaryRecord[],
    limit: number,
    latitude?: number,
    longitude?: number,
  ): ShopListResponse {
    const hasNext = records.length > limit;
    const page = hasNext ? records.slice(0, limit) : records;

    return {
      shops: page.map((shop) => this.toSummaryResponse(shop, latitude, longitude)),
      nextCursor: hasNext ? (page.at(-1)?.id ?? null) : null,
    };
  }

  private toSummaryResponse(
    shop: ShopSummaryRecord,
    latitude?: number,
    longitude?: number,
  ): ShopSummaryResponse {
    const shopLatitude = shop.latitude.toNumber();
    const shopLongitude = shop.longitude.toNumber();
    return {
      shopId: shop.id,
      name: shop.name,
      address: shop.address,
      addressDetail: shop.addressDetail,
      districtName: shop.districtName,
      adminDongName: shop.adminDongName,
      latitude: shopLatitude,
      longitude: shopLongitude,
      thumbnailImageUrl: shop.thumbnailImageUrl,
      businessHours: shop.businessHours,
      closedDays: shop.closedDays,
      rating: shop.rating.toNumber(),
      reviewCount: shop.reviewCount,
      distanceMeters:
        latitude !== undefined && longitude !== undefined
          ? this.distanceMeters(latitude, longitude, shopLatitude, shopLongitude)
          : null,
      isWished: shop.wishes.length > 0,
    };
  }

  private distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const value =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return Math.round(6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
  }
}
