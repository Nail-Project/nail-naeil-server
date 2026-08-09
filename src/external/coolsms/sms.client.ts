import { SolapiMessageService } from 'solapi';

// 텍스트(SMS/LMS) 전용 발송 클라이언트.
// 견적 요청 도메인의 샵향 MMS 발송(SmsService)과 달리, 이미지 없이 사용자에게 알림 문자를 보내는 용도다.
// 예약 리마인더 등 사용자 대상 알림 문자에 재사용한다.
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';
const SMS_FROM = process.env.SMS_FROM ?? '';
const SMS_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`SMS 타임아웃: ${ms}ms 초과`)), ms),
    ),
  ]);
}

export interface TextSmsClient {
  sendText(to: string, text: string): Promise<void>;
}

export class SolapiTextSmsClient implements TextSmsClient {
  private readonly client: SolapiMessageService | null;

  constructor() {
    const apiKey = process.env.COOLSMS_API_KEY;
    const apiSecret = process.env.COOLSMS_API_SECRET;

    if (apiKey && apiSecret) {
      this.client = new SolapiMessageService(apiKey, apiSecret);
    } else {
      this.client = null;
      console.warn('[TextSmsClient] COOLSMS_API_KEY 또는 COOLSMS_API_SECRET 미설정, SMS 발송 비활성');
    }
  }

  // 단건 텍스트 발송. SMS_ENABLED=false 또는 API 키 미설정이면 실제 발송 없이 정상 통과한다(로컬/테스트).
  async sendText(to: string, text: string): Promise<void> {
    if (!SMS_ENABLED || !this.client) {
      console.log('[TextSmsClient] SMS 발송 건너뜀');
      return;
    }

    await withTimeout(
      this.client.send({ to, from: SMS_FROM, text, autoTypeDetect: true }),
      SMS_TIMEOUT_MS,
    );
  }
}
