import { SubscriptionRepository } from '../repository/subscription.repository';

// 구독(NPlus) 조회 비즈니스 로직을 담당한다.
// 결제/구독 생성 API는 범위 밖(P2)이며, 현재는 가입 여부 조회만 제공한다.
export class SubscriptionService {
  // 테스트에서 fake repository를 주입할 수 있도록 기본값과 함께 생성자로 받는다.
  constructor(private readonly subscriptionRepository = new SubscriptionRepository()) {}

  // NPlus 가입 여부. ACTIVE이면서 만료되지 않은 구독이 하나라도 있으면 true.
  async isNPlus(userId: number): Promise<boolean> {
    const activeCount = await this.subscriptionRepository.countActive(userId, new Date());
    return activeCount > 0;
  }
}
