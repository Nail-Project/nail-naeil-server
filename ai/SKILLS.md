# SKILLS — 작업 시 실전 가이드

이 문서는 AI 코딩 도구가 코드를 작성하거나 수정하기 직전에 참고할 실전 체크리스트와
스택별 세부 규칙을 담는다. 원칙은 [ARCHITECTURE.md](./ARCHITECTURE.md)와 [CONVENTION.md](./CONVENTION.md)에, 실행 지침은 이 문서에 둔다.

## 상황별 문서 라우팅

| 하려는 작업 | 먼저 볼 문서 |
|---|---|
| 새 도메인/API 추가 | ARCHITECTURE.md → CONVENTION.md |
| DTO 새로 작성 | CONVENTION.md (2. DTO 규칙) |
| 에러/예외 추가 | CONVENTION.md (3. 예외 처리 규칙) |
| 브랜치 생성, 커밋 | CONVENTION.md (5. Git 관련 규칙) |
| 인증/JWT 관련 작업 | 아래 "JWT 인증" 섹션 |
| Swagger 문서화 | 아래 "Swagger" 섹션 |
| DB 스키마 변경 | 아래 "Prisma / MySQL" 섹션 |
| 배포/CI 설정 변경 | 아래 "Docker / GitHub Actions" 섹션 |
| 코드 검사 및 포맷 | 아래 "코드 품질 검사" 섹션 |

---

## 스택별 세부 규칙

### Swagger
- 새 엔드포인트를 추가하면 Swagger 문서에도 함께 반영한다.
- 현재 프로젝트의 `swagger-jsdoc` 작성 방식을 따르며 tsoa나 NestJS 데코레이터 방식을 섞지 않는다.

### JWT 인증
- 토큰 발급과 검증 로직은 `common/middlewares` 또는 `infra` 하위에서 공통 처리하고, 각 도메인의 Controller나 Service에서 중복 구현하지 않는다.
- Access Token과 Refresh Token의 만료 시간 등 정책 값은 `config/`에서 관리하며 하드코딩하지 않는다.
- 토큰 시크릿 값은 `.env`로 관리하고 코드에 노출하지 않는다.

### Prisma / MySQL
- 스키마 변경은 마이그레이션 파일로 관리하며 DB 콘솔에서 직접 변경하지 않는다.
- Repository 계층에서만 Prisma Client를 사용한다.

### Docker / GitHub Actions

- 로컬 개발 환경과 배포 환경의 Dockerfile 및 설정 차이를 명확히 구분한다.
- CI/CD 워크플로우 변경에는 `infra/{작업명}` 브랜치와 `infra` 커밋 타입을 사용한다.
- 배포 관련 환경 변수는 GitHub Actions Secrets로 관리하고 코드에 노출하지 않는다.

### 코드 품질 검사

- `npm run lint`: ESLint와 Prettier 검사를 실행한다.
- `npm run lint:fix`: ESLint 오류를 자동 수정하고 Prettier 포맷을 적용한다.
- `npm run format`: Prettier 포맷을 적용한다.
- `npm run format:check`: 파일을 수정하지 않고 Prettier 포맷만 검사한다.
- 구현 완료 후 `npm run lint`와 `npm run typecheck`를 실행한다.
- 테스트가 있는 기능은 `npm test -- --run`으로 전체 테스트를 한 번 실행한다.

---

## 구현 전후 최종 체크리스트

1. 파일/클래스/변수 네이밍이 CONVENTION.md를 따르는가?
2. 새 코드가 ARCHITECTURE.md의 올바른 위치(계층/폴더)에 있는가?
3. Controller가 Service만 호출하고 Repository/Prisma를 직접 쓰지 않는가?
4. Request/Response DTO가 CONVENTION.md 규칙대로 명명되고, 민감 정보가 응답에 노출되지 않는가?
5. 에러를 문자열로 반환하지 않고 공통 에러 객체를 throw하는가?
6. 불필요한 주석이 없고, 필요한 곳엔 담당자 포함 TODO가 있는가?
7. 커밋 메시지가 CONVENTION.md의 `type: 작업 내용` 형식을 따르는가?
8. 작업 브랜치 이름이 CONVENTION.md 규칙에 맞는가?
9. 새 의존성이 PROJECT.md의 기술 스택 범위에 포함되는가? 범위를 벗어나면 먼저 승인을 요청했는가?
10. `npm run lint`와 `npm run typecheck`가 통과하는가?
11. 테스트가 있는 기능은 `npm test -- --run`이 통과하는가?
