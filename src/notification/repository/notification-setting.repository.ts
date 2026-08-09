import { getPrisma } from '../../infra/prisma';

// 응답에 노출하는 설정 필드만 추린 형태(id/timestamps는 제외).
export interface NotificationSettingRecord {
  estimateEnabled: boolean;
  reservationEnabled: boolean;
  marketingEnabled: boolean;
}

const settingSelect = {
  estimateEnabled: true,
  reservationEnabled: true,
  marketingEnabled: true,
} as const;

// 알림 수신 설정 DB 접근을 담당한다.
export class NotificationSettingRepository {
  // 사용자 설정 단건 조회. 행이 없으면 null(기본값 처리는 서비스에서).
  findByUserId(userId: number): Promise<NotificationSettingRecord | null> {
    return getPrisma().notificationSetting.findUnique({
      where: { userId },
      select: settingSelect,
    });
  }

  // 부분 수정. 행이 없으면 DB 기본값(전부 ON) 위에 전달값(patch)을 얹어 생성한다.
  upsert(
    userId: number,
    patch: Partial<NotificationSettingRecord>,
  ): Promise<NotificationSettingRecord> {
    return getPrisma().notificationSetting.upsert({
      where: { userId },
      create: { userId, ...patch },
      update: patch,
      select: settingSelect,
    });
  }
}
