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
});

class FakeShopQueryRepository implements ShopQueryRepository {
  async findList(): Promise<ShopSummaryRecord[]> {
    return [shop(1), shop(2), shop(3)];
  }

  async search(keyword: string): Promise<ShopSummaryRecord[]> {
    return keyword === '네일샵' ? [shop(2)] : [];
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
    await expect(service.getList({ limit: 2 })).resolves.toMatchObject({
      shops: [{ shopId: 1 }, { shopId: 2 }],
      nextCursor: 2,
    });
  });

  it('샵 이름과 주소 검색 결과를 반환한다', async () => {
    await expect(service.search({ keyword: '네일샵', limit: 20 })).resolves.toMatchObject({
      shops: [{ shopId: 2, name: '네일샵 2' }],
      nextCursor: null,
    });
  });

  it('샵 상세 정보를 반환한다', async () => {
    await expect(service.getDetail(1)).resolves.toMatchObject({
      shopId: 1,
      phoneNumber: '01012345678',
      locationGuide: '상도역 1번 출구',
      parkingInfo: '주차 가능',
    });
  });

  it('존재하지 않는 샵 상세 조회는 404 예외를 던진다', async () => {
    await expect(service.getDetail(999)).rejects.toMatchObject({
      code: 'SHOP_NOT_FOUND',
      statusCode: 404,
    });
  });
});
