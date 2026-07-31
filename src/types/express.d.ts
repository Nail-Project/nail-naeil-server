// 인증 미들웨어(authenticate)가 검증한 accessToken에서 추출한 값을
// 이후 컨트롤러에서 사용할 수 있도록 Express.Request 타입을 확장한다.
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      role?: string;
    }
  }
}

export {};
