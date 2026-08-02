// 푸시 발송 추상화 레이어.
// 현재는 no-op(stub)이며, FCM 크리덴셜과 디바이스 토큰이 준비되면 이 인터페이스를 구현한
// FcmPushSender로 교체만 하면 된다(호출부 NotificationService는 변경 불필요).
export interface PushMessage {
  userId: number;
  title: string;
  body: string;
  // 알림 클릭 시 이동에 필요한 부가 데이터. FCM 연동 시 문자열 맵으로 변환해 실어보낸다.
  data?: unknown;
}

export interface PushSender {
  send(message: PushMessage): Promise<void>;
}

// FCM 미연동 상태의 기본 구현: 실제 발송 대신 로깅만 한다.
export class NoopPushSender implements PushSender {
  async send(message: PushMessage): Promise<void> {
    console.info('[PushSender:noop] 푸시 발송 생략(FCM 미연동)', {
      userId: message.userId,
      title: message.title,
    });
  }
}
