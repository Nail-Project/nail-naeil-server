import { describe, expect, it, vi } from 'vitest';
import type { SbizShopClient } from '../../src/external/sbiz/sbiz-shop.client';
import type { ShopRepository } from '../../src/shop/repository/shop.repository';
import { ShopSyncService } from '../../src/shop/service/shop-sync.service';

describe('ShopSyncService', () => {
  it('유효한 동일 업종 샵만 저장하고 누락된 항목은 건너뛴다', async () => {
    const client: SbizShopClient = {
      getShopsByIndustry: vi.fn().mockResolvedValue({
        totalCount: 3,
        items: [
          {
            bizesId: 'store-1',
            bizesNm: '내일네일',
            indsSclsCd: 'S20703',
            indsSclsNm: '네일숍',
            ctprvnCd: '11',
            ctprvnNm: '서울특별시',
            signguCd: '11680',
            signguNm: '강남구',
            adongCd: '11680640',
            adongNm: '역삼1동',
            rdnmAdr: '서울시 강남구 테헤란로 1',
            lon: '127.1',
            lat: '37.5',
          },
          {
            bizesId: 'store-2',
            bizesNm: '다른 업종',
            indsSclsCd: 'OTHER',
            rdnmAdr: '서울시 강남구 테헤란로 2',
            lon: '127.2',
            lat: '37.6',
          },
          {
            bizesId: 'store-3',
            bizesNm: '빈 좌표 네일',
            indsSclsCd: 'S20703',
            rdnmAdr: '서울시 강남구 테헤란로 3',
            lon: '',
            lat: '',
          },
        ],
      }),
    };
    const repository: ShopRepository = {
      upsertExternalShops: vi.fn().mockImplementation(async (shops) => shops.length),
    };

    const result = await new ShopSyncService(client, repository).sync({
      industryCode: 'S20703',
      pageSize: 100,
      maxPages: 10,
    });

    expect(repository.upsertExternalShops).toHaveBeenCalledWith([
      expect.objectContaining({
        externalStoreId: 'store-1',
        name: '내일네일',
        provinceCode: '11',
        provinceName: '서울특별시',
        districtCode: '11680',
        districtName: '강남구',
        adminDongCode: '11680640',
        adminDongName: '역삼1동',
        latitude: 37.5,
        longitude: 127.1,
      }),
    ]);
    expect(result).toEqual({
      requestedIndustryCode: 'S20703',
      fetchedCount: 3,
      savedCount: 1,
      skippedCount: 2,
      processedPages: 1,
    });
  });

  it('빈 페이지를 받으면 전체 건수와 관계없이 조회를 종료한다', async () => {
    const getShopsByIndustry = vi
      .fn()
      .mockResolvedValueOnce({ items: [], totalCount: 2 })
      .mockResolvedValueOnce({ items: [], totalCount: 2 });
    const client: SbizShopClient = { getShopsByIndustry };
    const repository: ShopRepository = {
      upsertExternalShops: vi.fn().mockResolvedValue(0),
    };

    await new ShopSyncService(client, repository).sync({
      industryCode: 'S20703',
      pageSize: 1,
      maxPages: 10,
    });

    expect(getShopsByIndustry).toHaveBeenCalledTimes(1);
    expect(repository.upsertExternalShops).not.toHaveBeenCalled();
  });
});
