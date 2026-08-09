# 이슈 & PR 본문 (feat/user-profile-image)

> GitHub에 그대로 복붙용. 이슈 먼저 만들고 → PR에서 이슈 번호 연결.

---

## 1) 이슈

**제목**
```
[feat] 마이페이지 프로필 사진 필드 추가 및 이름·전화번호 수정 제외
```

**Label**: `feat`

**본문**

### 작업 이유
마이페이지(PATCH `/api/v1/users/me`) 리뷰 피드백 반영.
- request body에 프로필 사진을 받는 필드가 없었다.
- 최초 가입 시 입력한 이름(nickname)·전화번호(phoneNumber)는 PM 결정에 따라 수정하지 않는다. ([Figma / PM 확인](https://www.figma.com/design/gx47YwfWLVJNpuG0gbPs1h/네일내일?node-id=1567-12518))

### 작업 내용
- [ ] User 모델에 `profileImageUrl` 컬럼 추가 + 마이그레이션
- [ ] 마이페이지 수정 요청에서 `nickname`·`phoneNumber` 제거
- [ ] 마이페이지 수정 요청에 `profileImageUrl`(S3 URL 검증) 추가, `email` 유지
- [ ] 조회/수정 응답에 `profileImageUrl` 반영
- [ ] Swagger 문서 및 테스트 갱신

### 완료 기준
- PATCH `/api/v1/users/me`가 `email`, `profileImageUrl`만 수정 가능하다.
- `nickname`, `phoneNumber`는 수정 요청 스키마에서 제외된다.
- 조회/수정 응답에 `profileImageUrl`이 포함된다.
- typecheck 및 테스트가 모두 통과한다.

---

## 2) Pull Request

**base**: `dev` ← **compare**: `feat/user-profile-image`
**Assignees**: 본인 / **Labels**: `feat`
**연결**: `Closes #<이슈번호>`

**제목**
```
feat: 마이페이지 프로필 사진 필드 추가 및 이름·전화번호 수정 제외
```

**본문**

## 작업 내용
마이페이지 API 리뷰 피드백을 반영했습니다.

- **프로필 사진 필드 추가**: User 모델에 `profileImageUrl`(nullable) 추가. 수정 요청에서 견적 이미지와 동일한 S3 URL 정규식으로 검증합니다. 이미지는 image 도메인에 업로드 후 URL만 전달받습니다.
- **이름·전화번호 수정 제외**: 최초 가입 시 입력하는 `nickname`, `phoneNumber`는 정책상 수정 불가라 수정 요청 스키마에서 제거했습니다. 수정 가능 필드는 `email`, `profileImageUrl`입니다.
- 조회/수정 응답 DTO, Swagger 문서, 테스트를 함께 갱신했습니다.

## 변경 파일
- `prisma/schema.prisma`, `prisma/migrations/20260805120000_add_user_profile_image/` — `profile_image_url` 컬럼 및 마이그레이션
- `src/user/dto/update-user-request.ts` — nickname·phoneNumber 제거, profileImageUrl 추가
- `src/user/dto/get-user-response.ts`, `src/user/service/user.service.ts`, `src/user/repository/user.repository.ts` — profileImageUrl 반영
- `src/user/controller/user.controller.ts` — Swagger 문서 갱신
- `test/user/user.service.test.ts` — 테스트 갱신

## 테스트
- `npm run typecheck` 통과
- `npm test` 통과 (176 tests)

## 리뷰 참고
- 로컬 DB 마이그레이션 적용 시, FCM 브랜치가 dev에 머지되기 전이라 `device_tokens` drift가 보일 수 있습니다. dev 머지 후 해소됩니다.

Closes #<이슈번호>
