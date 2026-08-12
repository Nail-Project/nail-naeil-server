// PATCH /api/v1/notifications/settings - 알림 수신 설정 부분 수정 요청 검증 스키마
import { z } from 'zod';

// 세 항목 모두 선택 입력이며, 전달된 항목만 갱신한다.
// .strict()로 정의되지 않은 키가 들어오면 400으로 거른다.
export const UpdateNotificationSettingsRequest = z
  .object({
    estimateEnabled: z.boolean().optional(),
    reservationEnabled: z.boolean().optional(),
    marketingEnabled: z.boolean().optional(),
  })
  .strict();

export type UpdateNotificationSettingsRequest = z.infer<typeof UpdateNotificationSettingsRequest>;
