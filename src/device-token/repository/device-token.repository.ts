import { getPrisma } from '../../infra/prisma';
import { DevicePlatform } from '../../generated/prisma/client';

export class DeviceTokenRepository {
  // 토큰 등록. 같은 토큰이 이미 있으면(기기 재로그인/계정 전환) 소유자·플랫폼을 갱신한다.
  // token이 unique이므로 upsert로 중복 등록을 멱등하게 처리한다.
  upsert(data: { userId: number; token: string; platform: DevicePlatform }) {
    return getPrisma().deviceToken.upsert({
      where: { token: data.token },
      create: data,
      update: { userId: data.userId, platform: data.platform },
    });
  }

  // 특정 사용자의 모든 디바이스 토큰 문자열을 조회한다(발송 대상).
  async findTokensByUser(userId: number): Promise<string[]> {
    const rows = await getPrisma().deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    return rows.map((row) => row.token);
  }

  // 본인 소유 토큰 해제(로그아웃 등). 소유자 불일치 시 아무것도 지우지 않는다.
  deleteByToken(userId: number, token: string) {
    return getPrisma().deviceToken.deleteMany({ where: { userId, token } });
  }

  // 발송 시 FCM이 무효 판정한 토큰을 일괄 정리한다(소유자 무관, 토큰 값 기준).
  deleteByTokens(tokens: string[]) {
    if (tokens.length === 0) {
      return Promise.resolve({ count: 0 });
    }

    return getPrisma().deviceToken.deleteMany({ where: { token: { in: tokens } } });
  }
}
