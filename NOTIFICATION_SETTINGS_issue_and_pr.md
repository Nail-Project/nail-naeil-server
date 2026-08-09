# 이슈 & PR 본문 (feat/notification-settings)

> GitHub에 그대로 복붙용. 이슈 먼저 만들고 → PR에서 이슈 번호 연결.
> base `dev` ← compare `feat/notification-settings`, Squash merge, Assignees/Labels 등록.

---

## 1) 이슈

**제목**
```
[feat] 알림 수신 설정 조회·수정 API (견적/예약/마케팅 ON·OFF)
```

**Label**: `feat`

**본문**

### 작업 이유
알림(인앱/FCM) 기능은 있지만 사용자가 카테고리별로 수신 여부를 끌 수단이 없다. 견적/예약/마케팅 알림 각각을 ON·OFF 할 수 있는 설정 API가 필요하다. (이 설정은 후속 "알림 생성" 작업에서 발송 게이트로 사용한다.)

### 작업 내용
- [ ] `NotificationSetting` 모델(estimate/reservation/marketing enabled, 기본 true, userId unique) + 마이그레이션
- [ ] `GET /api/v1/notifications/settings` — 설정 조회(행 없으면 기본값 전부 ON)
- [ ] `PATCH /api/v1/notifications/settings` — 부분 수정(전달 항목만 갱신, 첫 수정 시 lazy 생성)
- [ ] repository/service/controller/route/dto/error 구성
- [ ] Swagger 문서 및 테스트 갱신

### 완료 기준
- 설정 조회/수정 API가 정상 동작한다.
- 설정한 적 없는 사용자는 기본값(모두 ON)을 받는다.
- 정의되지 않은 키나 boolean 아닌 값은 400으로 거른다.
- typecheck 및 관련 테스트가 통과한다.

---

## 2) Pull Request

**base**: `dev` ← **compare**: `feat/notification-settings`
**Assignees**: 본인 / **Labels**: `feat`
**연결**: `Closes #<이슈번호>`

**제목**
```
feat: 알림 수신 설정 조회·수정 API
```

**본문**

## 작업 내용
견적/예약/마케팅 알림 각각의 수신 여부를 관리하는 설정 API를 추가했습니다.

- **스키마**: `NotificationSetting`(userId unique, `estimateEnabled`/`reservationEnabled`/`marketingEnabled`, 기본 true) + 마이그레이션. 회원 탈퇴 시 Cascade 삭제.
- **조회 `GET /api/v1/notifications/settings`**: 설정 행이 없으면 기본값(모두 ON)을 반환하며, 조회 시점에는 행을 생성하지 않습니다.
- **수정 `PATCH /api/v1/notifications/settings`**: 전달한 항목만 부분 갱신하고, 첫 수정이면 기본값 위에 얹어 upsert로 lazy 생성합니다. 요청 스키마는 `.strict()`라 정의되지 않은 키/boolean 아닌 값은 400(`INVALID_NOTIFICATION_SETTING_REQUEST`)으로 거릅니다.
- **라우팅**: 알림 도메인 아래 별도 라우터로 `/notifications`에 마운트했습니다(shop 도메인과 동일하게 base 공유). 정적 경로 `/settings`가 목록 라우터의 `/:notificationId`보다 먼저 매칭되도록 설정 라우터를 먼저 등록했습니다.

## 변경 파일
- `prisma/schema.prisma`, `prisma/migrations/20260809140000_add_notification_settings/` — 모델·마이그레이션
- `src/notification/repository/notification-setting.repository.ts` — 조회/upsert
- `src/notification/service/notification-setting.service.ts` — 기본값 처리·수정 로직
- `src/notification/controller/notification-setting.controller.ts` — 핸들러 + Swagger
- `src/notification/dto/get-notification-settings-response.ts`, `src/notification/dto/update-notification-settings-request.ts` — 응답/요청 DTO
- `src/notification/error/notification.error.ts` — 검증 에러 추가
- `src/notification/notification-setting.route.ts`, `src/routes/v1.router.ts` — 라우팅
- `test/notification/notification-setting.service.test.ts`, `test/notification/notification-setting.route.test.ts` — 테스트

## 테스트
- `npm run typecheck` 통과
- `npm test`: 추가 테스트(service 3, route 4) 통과

## 리뷰 참고
- 마이그레이션 적용: `npx prisma migrate dev`(로컬 drift 있으면 `migrate reset`) 후 `npx prisma generate`.
- 이 설정을 실제 발송에서 참조하는 "알림 생성" 게이트는 후속 작업(③)에서 붙입니다.
- ⚠️ `test/app.test.ts`, `test/shop/shop-query.swagger.test.ts`의 swagger 실패는 **이 브랜치와 무관한 dev 기존 이슈**입니다(Windows에서 swagger `paths`가 비는 문제).

Closes #<이슈번호>
