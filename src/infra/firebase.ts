import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

// firebase-admin은 프로세스당 한 번만 초기화한다(getPrisma와 동일한 lazy singleton 패턴).
let messaging: Messaging | undefined;

// 서비스 계정 크리덴셜 3종이 모두 설정되어 있어야 FCM 발송이 가능하다.
// 미설정 시(로컬 개발/테스트) FcmPushSender 대신 NoopPushSender로 폴백하기 위한 판별용.
export const isFirebaseConfigured = (): boolean =>
  Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );

export const getFirebaseMessaging = (): Messaging => {
  if (messaging) {
    return messaging;
  }

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase 크리덴셜(FIREBASE_*)이 설정되지 않았습니다.');
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env 한 줄에 저장하려면 개행을 "\n" 문자열로 넣으므로, 실제 개행으로 복원한다.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  messaging = getMessaging();

  return messaging;
};
