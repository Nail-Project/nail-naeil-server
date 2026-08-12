// 인증 미들웨어(common/authMiddleware, user/authenticate)가 검증한 accessToken에서
// 추출한 값을 이후 컨트롤러에서 사용할 수 있도록 Express.Request 타입을 확장한다.
// 이 파일 한 곳에서만 선언한다 - 예전엔 auth.middleware.ts에도 별도 선언이 있었음(2026-08-09 정리).
// 인증 미들웨어를 거치지 않은 요청에선 실제로 undefined이지만, 그런 라우트는 애초에
// req.userId/role을 읽지 않으므로 필수 타입으로 선언해 인증 이후 코드에서 매번 null 체크를
// 반복하지 않게 한다 (기존 auth.middleware.ts 선언과 동일한 방식).
declare global {
  namespace Express {
    interface Request {
      userId: number;
      role: string;
    }
  }
}

export {};
