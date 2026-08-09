# 이슈 & PR 본문 (feat/nplus-subscription)

> GitHub에 그대로 복붙용. 이슈 먼저 만들고 → PR에서 이슈 번호 연결.
> base `dev` ← compare `feat/nplus-subscription`, Squash merge, Assignees/Labels 등록.

---

## 1) 이슈

**제목**
```
[feat] 마이페이지 요약 필드 추가(진행 중 견적 수·다가오는 예약 수·NPlus 여부) 및 NPlus 구독 모델 신규
```

**Label**: `feat`

**본문**

### 작업 이유
마이페이지(`GET /api/v1/users/me`) 응답에 홈/마이페이지 상단 요약에 필요한 수치가 없다.
- 진행 중 견적 수, 다가오는 예약 수를 프론트가 별도 API 없이 마이페이지 한 번에 받도록 한다.
- NPlus 가입 여부를 노출해야 하는데, 현재 스키마·코드에 구독/멤버십 개념이 전혀 없어 최소 구독 모델을 새로 설계한다. (결제 연동은 범위 밖 — P2)

### 작업 내용
- [ ] `Subscription` 모델 + `SubscriptionPlan`/`SubscriptionStatus` enum + 마이그레이션 추가
- [ ] 구독 조회(`SubscriptionService.isNPlus`) 구현 — ACTIVE이면서 만료되지 않은 구독 존재 여부로 판단
- [ ] `EstimateRequestService.countInProgress`(status=MATCHING) 추가
- [ ] `ReservationService.countUpcoming`(CONFIRMED + 예약 시각 미도래) 추가
- [ ] 마이페이지 응답 DTO/서비스에 `inProgressEstimateCount`, `upcomingReservationCount`, `isNPlus` 반영
- [ ] Swagger 문서 및 테스트 갱신

### 완료 기준
- `GET /api/v1/users/me` 응답에 세 필드가 포함된다.
- 요약 수치는 각 도메인 **Service**를 통해 조회한다(타 도메인 Repository 직접 접근 없음).
- NPlus 여부는 활성 구독 존재 여부로 계산된다.
- typecheck 및 테스트가 모두 통과한다.

---

## 2) Pull Request

**base**: `dev` ← **compare**: `feat/nplus-subscription`
**Assignees**: 본인 / **Labels**: `feat`
**연결**: `Closes #<이슈번호>`

**제목**
```
feat: 마이페이지 요약 필드 추가 및 NPlus 구독 모델 신규
```

**본문**

## 작업 내용
마이페이지 응답을 확장하고, 그 전제가 되는 NPlus 구독 모델을 새로 추가했습니다.

- **NPlus 구독 모델**: `Subscription`(userId, plan, status, startedAt, expiresAt) + enum 2종 신규. 가입 여부는 `status=ACTIVE`이면서 만료되지 않은(`expiresAt`이 null이거나 미래) 구독이 존재하는지로 판단합니다. 결제/구독 생성 API는 범위 밖(P2)이라 조회만 제공합니다.
- **마이페이지 요약 3필드**: `inProgressEstimateCount`(진행 중 견적, status=MATCHING), `upcomingReservationCount`(CONFIRMED + 예약 시각 미도래), `isNPlus`. 세 수치는 각 도메인 Service(`EstimateRequestService`, `ReservationService`, `SubscriptionService`)를 통해 병렬 조회합니다.
- 아키텍처 규칙에 맞춰 타 도메인 Repository를 직접 참조하지 않고 Service만 호출합니다. `ReservationService`는 마이페이지에서 간단히 쓰도록 생성자 repository에 기본값을 부여했습니다(라우터/테스트의 명시적 주입은 그대로 유지).
- 조회/수정 응답 DTO, Swagger 문서, 테스트를 함께 갱신했습니다.

## 변경 파일
- `prisma/schema.prisma`, `prisma/migrations/20260809120000_add_subscriptions/` — Subscription 모델·enum·마이그레이션
- `src/subscription/repository/subscription.repository.ts`, `src/subscription/service/subscription.service.ts` — 구독 조회(신규)
- `src/estimate-request/repository/estimate-request.repository.ts`, `src/estimate-request/service/estimate-request.service.ts` — 진행 중 견적 수 count
- `src/reservation/repository/reservation.repository.ts`, `src/reservation/service/reservation.service.ts` — 다가오는 예약 수 count + 생성자 기본값
- `src/user/dto/get-user-response.ts`, `src/user/service/user.service.ts`, `src/user/controller/user.controller.ts` — 요약 필드 반영 및 Swagger
- `test/user/user.service.test.ts`, `test/subscription/subscription.service.test.ts`, `test/reservation/reservation.service.test.ts` — 테스트 갱신/추가

## 테스트
- `npm run typecheck` 통과
- `npm test` 통과

## 리뷰 참고
- 마이그레이션 적용 순서: `npx prisma migrate dev`(또는 배포 시 `migrate deploy`) 후 `npx prisma generate`.
- `Subscription`은 조회 전용으로만 추가했습니다. 구독 생성/해지 API는 후속(결제 연동 시점)에서 다룹니다.

Closes #<이슈번호>
