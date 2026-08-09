import { describe, expect, it, vi } from 'vitest';
import { SubscriptionService } from '../../src/subscription/service/subscription.service';
import type { SubscriptionRepository } from '../../src/subscription/repository/subscription.repository';

const createService = (countActive: number) =>
  new SubscriptionService({
    countActive: vi.fn().mockResolvedValue(countActive),
  } as unknown as SubscriptionRepository);

describe('SubscriptionService.isNPlus', () => {
  it('활성 구독이 하나 이상이면 true를 반환한다', async () => {
    const service = createService(1);
    await expect(service.isNPlus(1)).resolves.toBe(true);
  });

  it('활성 구독이 없으면 false를 반환한다', async () => {
    const service = createService(0);
    await expect(service.isNPlus(1)).resolves.toBe(false);
  });
});
