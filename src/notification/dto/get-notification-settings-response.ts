// GET·PATCH /api/v1/notifications/settings 응답 DTO
// 견적/예약/마케팅 알림 각각의 수신 여부(ON/OFF)를 반환한다.
export class GetNotificationSettingsResponse {
  estimateEnabled!: boolean;
  reservationEnabled!: boolean;
  marketingEnabled!: boolean;
}
