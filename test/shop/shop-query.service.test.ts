import { describe, expect, it } from 'vitest';
import type {
  ShopDetailRecord,
  ShopQueryRepository,
  ShopSummaryRecord,
} from '../../src/shop/repository/shop-query.repository';
import { ShopQueryService } from '../../src/shop/service/shop-query.service';

const decimal = (value: number) => ({ toNumber: () => value });
const shop = (id: number): ShopSummaryRecord => ({
  id,
  name: `네일샵 ${id}`,
  address: `서울특별시 동작구 상도로 ${id}`,
  addressDetail: null,
  districtName: '동작구',
  adminDongName: '상도동',
  latitude: decimal(37.5),
  longitude: decimal(126.95),
  thumbnailImageUrl: null,
  businessHours: null,
  closedDays: null,
  rating: decimal(4.5),
  reviewCount: 10,
  wishes: [],
});

class FakeShopQueryRepository implements ShopQueryRepository {
  async findList(): Promise<ShopSummaryRecord[]> {
    return [shop(1), shop(2), shop(3)];
  }

  async search(_userId: number, keyword: string): Promise<ShopSummaryRecord[]> {
    return keyword === '네일샵' ? [shop(2)] : [];
  }
  async exists(shopId: number) {
    return shopId === 1;
  }
  wished = false;
  async createWish() {
    this.wished = true;
  }
  async deleteWish() {
    const wasWished = this.wished;
    this.wished = false;
    return wasWished;
  }
  async findWishlist() {
    return [];
  }
  async findReviews() {
    return [];
  }

  async findDetail(shopId: number): Promise<ShopDetailRecord | null> {
    return shopId === 1
      ? {
          ...shop(1),
          phoneNumber: '01012345678',
          provinceName: '서울특별시',
          locationGuide: '상도역 1번 출구',
          parkingInfo: '주차 가능',
        }
      : null;
  }
}

describe('ShopQueryService', () => {
  const service = new ShopQueryService(new FakeShopQueryRepository());

  it('샵 목록을 커서 페이지 형태로 반환한다', async () => {
    await expect(service.getList({ limit: 2 }, 1)).resolves.toMatchObject({
      shops: [{ shopId: 1 }, { shopId: 2 }],
      nextCursor: 2,
    });
  });

  it('샵 이름과 주소 검색 결과를 반환한다', async () => {
    await expect(service.search({ keyword: '네일샵', limit: 20 }, 1)).resolves.toMatchObject({
      shops: [{ shopId: 2, name: '네일샵 2' }],
      nextCursor: null,
    });
  });

  it('샵 상세 정보를 반환한다', async () => {
    await expect(service.getDetail(1, 1)).resolves.toMatchObject({
      shopId: 1,
      phoneNumber: '01012345678',
      locationGuide: '상도역 1번 출구',
      parkingInfo: '주차 가능',
    });
  });

  it('존재하지 않는 샵 상세 조회는 404 예외를 던진다', async () => {
    await expect(service.getDetail(999, 1)).rejects.toMatchObject({
      code: 'SHOP_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('찜 토글 - 찜 안 한 상태면 추가하고, 찜한 상태면 해제한다', async () => {
    await expect(service.toggleWish(1, 1)).resolves.toEqual({ shopId: 1, isWished: true });
    await expect(service.toggleWish(1, 1)).resolves.toEqual({ shopId: 1, isWished: false });
  });

  it('존재하지 않는 샵 찜 토글은 404 예외를 던진다', async () => {
    await expect(service.toggleWish(999, 1)).rejects.toMatchObject({
      code: 'SHOP_NOT_FOUND',
      statusCode: 404,
    });
  });
});
