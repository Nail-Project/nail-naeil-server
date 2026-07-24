import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpSbizShopClient } from '../../src/external/sbiz/sbiz-shop.client';

describe('HttpSbizShopClient', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('설정된 시간 안에 응답하지 않으면 요청을 중단한다', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    const request = new HttpSbizShopClient(
      'service-key',
      'https://example.com',
      100,
    ).getShopsByIndustry('S20703', 1, 100);
    const rejection = expect(request).rejects.toMatchObject({
      code: 'SHOP_DATA_PROVIDER_ERROR',
      data: expect.objectContaining({ reason: 'timeout' }),
    });

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
  });
});
