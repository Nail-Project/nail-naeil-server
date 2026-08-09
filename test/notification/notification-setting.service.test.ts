import { describe, expect, it, vi } from 'vitest';
import { NotificationSettingService } from '../../src/notification/service/notification-setting.service';
import type { NotificationSettingRepository } from '../../src/notification/repository/notification-setting.repository';

const createService = (repo: Partial<NotificationSettingRepository>) =>
  new NotificationSettingService(repo as unknown as NotificationSettingRepository);

describe('NotificationSettingService.getSettings', () => {
  it('설정 행이 없으면 기본값(전부 ON)을 반환한다', async () => {
    const service = createService({ findByUserId: vi.fn().mockResolvedValue(null) });

    await expect(service.getSettings(1)).resolves.toEqual({
      estimateEnabled: true,
      reservationEnabled: true,
      marketingEnabled: true,
    });
  });

  it('설정 행이 있으면 저장된 값을 반환한다', async () => {
    const stored = { estimateEnabled: false, reservationEnabled: true, marketingEnabled: false };
    const service = createService({ findByUserId: vi.fn().mockResolvedValue(stored) });

    await expect(service.getSettings(1)).resolves.toEqual(stored);
  });
});

describe('NotificationSettingService.updateSettings', () => {
  it('전달된 부분 값으로 upsert하고 갱신된 설정을 반환한다', async () => {
    const upsert = vi.fn().mockResolvedValue({
      estimateEnabled: false,
      reservationEnabled: true,
      marketingEnabled: true,
    });
    const service = createService({ upsert });

    await expect(service.updateSettings(1, { estimateEnabled: false })).resolves.toMatchObject({
      estimateEnabled: false,
    });
    expect(upsert).toHaveBeenCalledWith(1, { estimateEnabled: false });
  });
});
