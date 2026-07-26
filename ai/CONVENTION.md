# CONVENTION

## 1. 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 파일명 | kebab-case + 역할 suffix | `user-auth.controller.ts`, `user-auth.service.ts` |
| 클래스명 | PascalCase | `UserAuthController`, `SignupUserRequest` |
| 변수/함수명 | camelCase | `userId`, `createUser()`, `findUser()` |
| 상수명 | UPPER_SNAKE_CASE | `ACCESS_TOKEN_EXPIRES` |

- **kebab-case**: 단어를 소문자로 쓰고 `-`로 연결
- **PascalCase**: 각 단어의 첫 글자를 대문자로 작성
- **camelCase**: 첫 단어는 소문자, 다음 단어부터 첫 글자 대문자
- 파일명에는 역할을 알 수 있는 suffix(`.controller`, `.service`, `.repository` 등)를 반드시 붙인다.

## 2. DTO 규칙

DTO는 API로 들어오거나 나가는 데이터의 형태를 정의하는 클래스다.

- Request Body와 Query Parameter는 DTO 클래스로 정의한다.
- `dto/` 폴더 안에 있으므로 파일명과 클래스명에는 `Dto` suffix를 붙이지 않는다.
- 요청 객체에는 `Request`, 응답 객체에는 `Response` suffix를 붙인다.

**파일명**: `{동작}-{도메인}-request.ts` / `{동작}-{도메인}-response.ts`
예: `signup-user-request.ts`, `signup-user-response.ts`

**클래스명**: `{동작}{도메인}Request` / `{동작}{도메인}Response`
예: `SignupUserRequest`, `SignupUserResponse`

**응답 규칙**
- Response 구조는 반드시 API 명세서와 일치시킨다.
- Prisma 모델을 그대로 응답하지 않고 Response 객체로 변환해 반환한다.
- 비밀번호, 내부 식별자, S3 object key 등 외부에 노출하면 안 되는 값은 응답에 포함하지 않는다.

## 3. 예외 처리 규칙

- Service에서 문자열 에러를 직접 반환하지 않는다.
- Controller나 Service에서 `res.status().send()`를 반복해서 작성하지 않는다.
- 에러가 발생하면 `common`에 정의된 공통 에러 객체를 throw한다.
- 예상 가능한 예외에는 명확한 에러 코드와 메시지를 사용한다.

```
USER_NOT_FOUND (404)
INVALID_PASSWORD (400)
DUPLICATED_EMAIL (409)
```

새 에러 코드를 추가할 때는 기존 `common/errors`에 정의된 패턴을 따르고 임의의 형식을 만들지 않는다.

## 4. 주석 및 환경 변수 규칙

**주석**
- 코드만으로 이해할 수 있는 로직에는 주석을 작성하지 않는다.
- 복잡한 비즈니스 정책, 예외 조건, 임시 우회 처리에는 주석을 작성한다.
- TODO 주석에는 담당자와 내용을 함께 남긴다.
  ```ts
  // TODO: [eun] 인증 정책 확정 후 refresh token 만료 시간 수정
  ```

**환경 변수**
- 민감한 보안 값은 코드에 하드코딩하지 않는다.
- `.env` 파일은 Git에 커밋하지 않는다. `.gitignore`에 반드시 등록한다.
- 새로운 환경 변수를 추가하면 `.env.example`과 팀 공유 문서를 함께 업데이트한다.

## 5. Git 관련 규칙

### 기본 브랜치
- `prod`: 제출 또는 배포 가능한 안정 버전이다. 직접 push하지 않는다.
- `dev`: 개발 내용을 통합하는 브랜치다. 모든 작업 브랜치는 `dev`에서 생성하며 직접 push하지 않는다.

### 작업 브랜치

| Prefix | 용도 | 예시 |
|---|---|---|
| `feat/{기능명}` | 새로운 기능 개발 | `feat/auth`, `feat/user-crud` |
| `fix/{기능명}` | 버그 수정 | `fix/login-validation` |
| `refactor/{기능명}` | 기능 변경 없이 코드 구조 개선 | `refactor/exception-filter` |
| `docs/{문서명}` | 문서 작성 및 수정 | `docs/api-spec` |
| `chore/{작업명}` | 설정, 의존성, 빌드 등 기타 작업 | `chore/eslint-prettier` |
| `infra/{작업명}` | 서버 인프라 작업 | `infra/docker`, `infra/deploy-setting` |

구분 기준: Docker/배포/서버 환경변수/CI-CD/DB 연결 환경 → `infra` | 패키지 설치/ESLint·Prettier/Swagger 설정 → `chore`

---

### 커밋 메시지 규칙

형식: `type: 작업 내용`

| 타입 | 용도 |
|---|---|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `docs` | 문서 작성 또는 수정 |
| `chore` | 설정, 빌드, 의존성 등 기타 작업 |
| `test` | 테스트 코드 작성 또는 수정 |
| `infra` | 배포, Docker, CI/CD 등 인프라 작업 |

```
feat: 회원가입 API 구현
fix: 로그인 검증 오류 수정
docs: PR 템플릿 추가
chore: Swagger 설정 추가
infra: EC2 배포 설정 추가
test: 회원가입 서비스 테스트 추가
```


---

### Pull Request 규칙

- PR에는 Assignees와 Labels를 등록한다.
- 최소 1명 이상이 리뷰한 후 merge한다. 급한 경우 팀 채널에 공유한 후 merge할 수 있다.
- Merge 방식은 Squash merge를 사용한다.

---

### 코드리뷰 규칙

- 단순 의견이나 취향은 `comment`로 남긴다.
- 반드시 수정해야 하는 부분은 `request changes`로 남긴다.
- 리뷰어는 수정이 필요한 이유를 함께 작성한다.
- 작성자는 반영 여부를 댓글로 남긴다.
- 이해하기 어려운 부분은 단정하지 않고 질문 형태로 남긴다.
