import { DeviceTokenRepository } from '../repository/device-token.repository';
import { DevicePlatform } from '../../generated/prisma/client';

// FCM 디바이스 토큰 등록/해제 비즈니스 로직.
export class DeviceTokenService {
  // 테스트에서 fake repository를 주입할 수 있도록 기본값과 함께 생성자로 받는다(다른 도메인과 동일 패턴).
  constructor(private readonly deviceTokenRepository = new DeviceTokenRepository()) {}

  // 토큰 등록(멱등). 이미 등록된 토큰이면 소유자/플랫폼만 갱신한다.
  async register(
    userId: number,
    params: { token: string; platform: DevicePlatform },
  ): Promise<void> {
    await this.deviceTokenRepository.upsert({
      userId,
      token: params.token,
      platform: params.platform,
    });
  }

  // 토큰 해제(로그아웃 등). 본인 소유가 아니면 아무 일도 일어나지 않는다.
  async unregister(userId: number, token: string): Promise<void> {
    await this.deviceTokenRepository.deleteByToken(userId, token);
  }
}
