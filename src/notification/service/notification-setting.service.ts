import {
  NotificationSettingRepository,
  type NotificationSettingRecord,
} from '../repository/notification-setting.repository';
import { GetNotificationSettingsResponse } from '../dto/get-notification-settings-response';
import type { UpdateNotificationSettingsRequest } from '../dto/update-notification-settings-request';

// 설정 행이 없을 때 반환하는 기본값. 신규 사용자는 모든 알림을 수신한다.
const DEFAULT_SETTINGS: NotificationSettingRecord = {
  estimateEnabled: true,
  reservationEnabled: true,
  marketingEnabled: true,
};

// 알림 수신 설정(견적/예약/마케팅 ON·OFF) 조회·수정 비즈니스 로직을 담당한다.
export class NotificationSettingService {
  // 테스트에서 fake repository를 주입할 수 있도록 기본값과 함께 생성자로 받는다.
  constructor(
    private readonly notificationSettingRepository = new NotificationSettingRepository(),
  ) {}

  // 설정 조회. 아직 설정한 적이 없으면(행 없음) 기본값(전부 ON)을 반환한다. GET에서는 행을 생성하지 않는다.
  async getSettings(userId: number): Promise<GetNotificationSettingsResponse> {
    const setting = await this.notificationSettingRepository.findByUserId(userId);
    return setting ?? { ...DEFAULT_SETTINGS };
  }

  // 설정 부분 수정. 전달된 항목만 갱신하며, 첫 수정이면 기본값 위에 얹어 lazy하게 생성한다.
  async updateSettings(
    userId: number,
    patch: UpdateNotificationSettingsRequest,
  ): Promise<GetNotificationSettingsResponse> {
    return this.notificationSettingRepository.upsert(userId, patch);
  }
}
