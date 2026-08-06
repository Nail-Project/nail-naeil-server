import { PushSender, NoopPushSender } from './push-sender';
import { FcmPushSender } from './fcm-push-sender';
import { isFirebaseConfigured } from '../../infra/firebase';

// Firebase 크리덴셜이 설정된 환경에서는 실제 FCM 발송(FcmPushSender)을,
// 미설정(로컬 개발/테스트) 환경에서는 로그만 남기는 NoopPushSender를 사용한다.
// NotificationService의 기본 주입값으로 쓰여, 호출부 변경 없이 환경에 따라 발송 방식이 결정된다.
export const createPushSender = (): PushSender =>
  isFirebaseConfigured() ? new FcmPushSender() : new NoopPushSender();
