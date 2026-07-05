# ARCHITECTURE

## 요청 처리 흐름

```
Client -> Route -> Controller -> Service -> Repository -> Database
```

## 기본 폴더 구조

도메인별 폴더 구조로 관리하며, 각 도메인은 `src/` 하위에 위치한다.

```
src/
  app.ts
  server.ts

  users/
    user.route.ts
    controller/
      user.controller.ts
    service/
      user.service.ts
    repository/
      user.repository.ts
    dto/
      request/
        signup-user-request.ts
      response/
        signup-user-response.ts

  common/
    errors/
    responses/
    middlewares/
    validators/

  infra/
    prisma/
    s3/

  external/
    maps/
    sms/

  config/
```

## 계층별 역할

- **route**: URL과 HTTP Method를 정의하고 Controller와 연결한다. 예: `POST /auth/signup` → `AuthController.signup()`
- **controller**
  - 요청 값을 받고 DTO 검증 결과를 바탕으로 Service를 호출한다.
  - 비즈니스 로직을 작성하지 않는다.
  - Prisma를 직접 사용하지 않는다.
- **service**
  - 핵심 비즈니스 흐름과 도메인 규칙을 처리한다. 예: 중복 이메일 확인, 비밀번호 암호화, 회원 생성 요청 처리
  - Service가 커지거나 조회와 상태 변경의 책임이 명확히 나뉘면 `QueryService`와 `CommandService`로 분리할 수 있다.
    ```
    초기: user.service.ts
    분리 후: user-query.service.ts / user-command.service.ts
    ```
- **repository**
  - Prisma를 사용한 DB 조회, 저장, 수정, 삭제를 담당한다.
  - Service는 반드시 Repository를 통해서만 DB에 접근한다.
- **dto**: 외부 요청과 응답의 데이터 구조를 정의한다. 요청값 검증과 Swagger 문서화에 사용하며 상세 규칙은 [CONVENTION.md](./CONVENTION.md)를 따른다.
- **common**: 여러 도메인의 공통 예외 처리, 응답 포맷, 전역 미들웨어, 유틸 함수를 관리한다.
- **infra**: Prisma Client, AWS S3 등 서버 운영과 데이터 저장을 위한 기반 기술 연동을 관리한다.
- **external**: 지도, 문자, 알림톡, 이메일, 결제 등 외부 API와 서드파티 연동을 관리한다.
- **config**: 환경 변수를 검증하고 설정 값을 관리한다.

## 계층 간 규칙

- Controller는 Service만 호출한다. Repository나 Prisma를 직접 호출하지 않는다.
- 다른 도메인의 데이터나 규칙이 필요하면 해당 도메인의 **Service**를 호출한다. 다른 도메인의 Repository는 직접 참조하지 않는다.
- 한 도메인 안에서는 DB 접근 방식을 통일한다.
- 새 코드를 어느 폴더에 넣을지 불분명하면 임의로 새 폴더를 만들지 않고 먼저 확인한다.
