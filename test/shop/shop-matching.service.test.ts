import { describe, expect, it, vi } from 'vitest';
import type {
  NearbyShopRecord,
  ShopMatchingRepository,
} from '../../src/shop/repository/shop-matching.repository';
import {
  SHOP_MATCHING_POLICIES,
  ShopMatchingService,
} from '../../src/shop/service/shop-matching.service';

const nearbyShop: NearbyShopRecord = {
  shopId: 1,
  name: '내일네일',
  phoneNumber: '01012345678',
  address: '서울특별시 동작구 상도로 1',
  addressDetail: null,
  latitude: 37.499,
  longitude: 126.953,
  distanceMeters: 350,
};

const createRepository = () => ({
  findNearbyShops: vi
    .fn<ShopMatchingRepository['findNearbyShops']>()
    .mockResolvedValue([nearbyShop]),
});

describe('ShopMatchingService', () => {
  it.each([
    ['CLOSE', 2_000, 5],
    ['BALANCED', 5_000, 8],
    ['WIDE', 10_000, 10],
  ] as const)('%s 정책에 맞는 반경과 샵 수를 적용한다', async (recommendType, radius, limit) => {
    const repository = createRepository();
    const service = new ShopMatchingService(repository);

    const result = await service.match({
      latitude: 37.499,
      longitude: 126.953,
      recommendType,
    });

    expect(repository.findNearbyShops).toHaveBeenCalledWith(37.499, 126.953, radius, limit);
    expect(result).toEqual([nearbyShop]);
  });

  it('가격 데이터가 없는 동안 최저가 탐색은 지원하지 않는다', async () => {
    const repository = createRepository();
    const service = new ShopMatchingService(repository);

    await expect(
      service.match({
        latitude: 37.499,
        longitude: 126.953,
        recommendType: 'CHEAP',
      }),
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_SHOP_RECOMMEND_TYPE',
      statusCode: 400,
    });
    expect(repository.findNearbyShops).not.toHaveBeenCalled();
  });

  it.each([
    [Number.NaN, 126.953],
    [91, 126.953],
    [37.499, -181],
  ])('유효하지 않은 좌표(%s, %s)는 거절한다', async (latitude, longitude) => {
    const repository = createRepository();
    const service = new ShopMatchingService(repository);

    await expect(
      service.match({ latitude, longitude, recommendType: 'CLOSE' }),
    ).rejects.toMatchObject({
      code: 'INVALID_SHOP_LOCATION',
      statusCode: 400,
    });
    expect(repository.findNearbyShops).not.toHaveBeenCalled();
  });

  it('정책 상수는 화면의 탐색 범위와 일치한다', () => {
    expect(SHOP_MATCHING_POLICIES).toEqual({
      CLOSE: { radiusMeters: 2_000, limit: 5 },
      BALANCED: { radiusMeters: 5_000, limit: 8 },
      WIDE: { radiusMeters: 10_000, limit: 10 },
    });
  });
});
