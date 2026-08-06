import { PushSender, PushMessage } from './push-sender';
import { DeviceTokenRepository } from '../../device-token/repository/device-token.repository';
import { getFirebaseMessaging } from '../../infra/firebase';

// FCM을 통한 실제 푸시 발송 구현체.
// PushMessage에는 userId만 있으므로, 발송 시 디바이스 토큰을 조회해 해당 사용자의 모든 기기로 멀티캐스트한다.
// sendEachForMulticast는 한 번에 최대 500개 토큰만 허용한다(초과 시 invalid-argument로 전체 실패).
const FCM_MULTICAST_LIMIT = 500;

export class FcmPushSender implements PushSender {
  constructor(private readonly deviceTokenRepository = new DeviceTokenRepository()) {}

  async send(message: PushMessage): Promise<void> {
    const tokens = await this.deviceTokenRepository.findTokensByUser(message.userId);

    // 등록된 기기가 없으면 발송할 대상이 없다(인앱 알림은 이미 저장된 상태).
    if (tokens.length === 0) {
      return;
    }

    // FCM data payload는 문자열 맵만 허용하므로 변환한다.
    const data = toStringDataMap(message.data);
    const invalidTokens: string[] = [];

    // 토큰이 500개를 넘으면 API가 실패하므로 500개씩 나눠 발송하고, 배치별 무효 토큰을 모은다.
    for (let start = 0; start < tokens.length; start += FCM_MULTICAST_LIMIT) {
      const batch = tokens.slice(start, start + FCM_MULTICAST_LIMIT);

      const response = await getFirebaseMessaging().sendEachForMulticast({
        tokens: batch,
        notification: { title: message.title, body: message.body },
        data,
      });

      response.responses.forEach((result, index) => {
        if (result.success) {
          return;
        }

        const token = batch[index];
        if (!token) {
          return;
        }

        // invalid-argument는 잘못된 payload 등 토큰 외 원인으로도 반환되므로 삭제 대상에서 제외한다.
        // 토큰 자체가 무효임이 확실한 코드만 정리한다.
        const code = result.error?.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          invalidTokens.push(token);
        }
      });
    }

    // 만료/무효 토큰은 계속 실패하므로 즉시 정리해 다음 발송의 낭비를 막는다.
    if (invalidTokens.length > 0) {
      await this.deviceTokenRepository.deleteByTokens(invalidTokens);
    }
  }
}

// 알림 클릭 시 이동에 쓰는 부가 데이터(data)를 FCM이 요구하는 { [key: string]: string } 형태로 변환한다.
const toStringDataMap = (data: unknown): Record<string, string> | undefined => {
  if (data === null || data === undefined || typeof data !== 'object') {
    return undefined;
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      continue;
    }
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }

  return result;
};
