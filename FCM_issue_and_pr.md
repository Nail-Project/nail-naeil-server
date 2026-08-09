# 이슈 & PR 본문 (feat/fcm-push)

> 아래 내용을 GitHub에 그대로 복붙하면 됩니다.
> - 이슈: 제목 prefix `[feat]` + label `feat`
> - PR: base `dev` ← compare `feat/fcm-push`, Squash merge, Assignees/Labels 등록, 이슈 연결

---

## 1) 이슈

**제목**

```
[feat] FCM 외부 푸시 발송 연동
```

**Label**: `feat`

**본문**

### 작업 이유
인앱 알림(#43)은 구현됐지만, 앱이 백그라운드/종료 상태일 때 사용자에게 알림을 전달할 방법이 없다. FCM을 연동해 외부 푸시 발송 경로를 확보한다.

### 작업 내용
- [ ] 디바이스 토큰 스키마 및 마이그레이션 추가
- [ ] FCM 디바이스 토큰 등록/해제 API 구현
- [ ] `firebase-admin` 의존성 추가 및 Firebase 초기화
- [ ] `FcmPushSender` 구현 및 알림 발송 계층 FCM 연동
- [ ] 환경별 FCM/Noop 발송 구현체 팩토리 분기

### 완료 기준
- 디바이스 토큰 등록/해제 API가 정상 동작한다.
- 알림 발송 시 등록된 토큰으로 FCM 푸시가 발송된다.
- 로컬/테스트 환경에서는 Noop 구현체로 동작해 실제 발송이 일어나지 않는다.
- 타입체크 및 테스트가 모두 통과한다.

---

## 2) Pull Request

**base**: `dev` ← **compare**: `feat/fcm-push`
**Assignees**: 본인 / **Labels**: `feat`
**연결**: `Closes #<이슈번호>`

**제목**

```
feat: FCM 외부 푸시 발송 연동
```

**본문**

## 작업 내용
FCM(Firebase Cloud Messaging)을 연동해 외부 푸시 발송 경로를 추가했습니다.

- **디바이스 토큰 관리**: 토큰 스키마/마이그레이션 추가, 등록·해제 API 구현 (`src/device-token/`)
- **FCM 발송 계층**: `firebase-admin` 도입, Firebase 초기화(`src/infra/firebase.ts`), `FcmPushSender` 구현 후 알림 발송 계층에 연동
- **환경별 분기**: `push-sender.factory.ts`에서 환경에 따라 FCM/Noop 구현체를 주입하도록 교체 → 로컬/테스트에서는 실제 발송 없이 동작

## 변경 파일 요약
- `prisma/schema.prisma`, `prisma/migrations/20260803083734_add_device_tokens/` — 디바이스 토큰 스키마·마이그레이션
- `src/device-token/**` — 토큰 등록/해제 컨트롤러·서비스·레포지토리·DTO·에러
- `src/infra/firebase.ts`, `src/notification/push/fcm-push-sender.ts`, `push-sender.factory.ts` — FCM 발송 구현
- `src/notification/service/notification.service.ts`, `src/routes/v1.router.ts` — 발송 계층 연동 및 라우팅
- `.env.example` — FCM 관련 환경변수 추가
- `package.json`, `package-lock.json` — `firebase-admin` 추가

## 테스트
- 타입체크 통과
- 테스트 전체 통과 (`fcm-push-sender.test.ts`, `device-token.route.test.ts` 포함)

## 리뷰 참고
- FCM 서비스 계정 키 등 환경변수는 `.env.example` 참고해 배포 환경에 설정 필요
- `RESERVATION_STATUS` 알림 발송(예약 백엔드) 및 안드로이드 토큰 등록 연동은 별도 공유 예정

Closes #<이슈번호>

---

## 3) 팀 전달 메시지

**안드로이드**
> FCM 디바이스 토큰 등록/해제 API 나왔어요. 로그인 후 발급받은 토큰을 등록 API로 보내주시면 됩니다. (엔드포인트/DTO는 `src/device-token/` 참고)

**예약 백엔드**
> 예약 상태 변경 시 `RESERVATION_STATUS` 알림 발송을 붙이면 등록된 토큰으로 FCM 푸시가 나갑니다. 발송 계층 연동은 완료됐어요.
