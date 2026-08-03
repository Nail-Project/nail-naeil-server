// POST /api/v1/device-tokens - FCM 디바이스 토큰 등록 시 Body 검증 스키마
import { z } from 'zod';

export const RegisterDeviceTokenRequest = z.object({
  // FCM 등록 토큰. 앱이 기기에서 발급받아 전달한다.
  token: z.string().min(1).max(255),
  // 미지정 시 ANDROID로 둔다(현재 안드로이드 우선).
  platform: z.enum(['ANDROID', 'IOS']).default('ANDROID'),
});

export type RegisterDeviceTokenRequest = z.infer<typeof RegisterDeviceTokenRequest>;

// DELETE /api/v1/device-tokens - 로그아웃/토큰 폐기 시 Body 검증 스키마
export const UnregisterDeviceTokenRequest = z.object({
  token: z.string().min(1).max(255),
});

export type UnregisterDeviceTokenRequest = z.infer<typeof UnregisterDeviceTokenRequest>;
