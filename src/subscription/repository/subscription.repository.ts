import { getPrisma } from '../../infra/prisma';

// 구독(NPlus) DB 접근을 담당한다.
export class SubscriptionRepository {
  // 활성 구독 수. status=ACTIVE이면서 만료되지 않은(expiresAt이 null이거나 미래) 구독만 센다.
  // 마이페이지 NPlus 가입 여부 판단에 사용한다.
  countActive(userId: number, now: Date): Promise<number> {
    return getPrisma().subscription.count({
      where: {
        userId,
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }
}
