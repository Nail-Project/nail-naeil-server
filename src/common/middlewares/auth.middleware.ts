import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, TokenExpiredError, TokenInvalidError } from '../errors/common.error';

// Express Request 타입에 userId, role 필드를 추가한다.
// auth 미들웨어를 통과한 이후의 핸들러에서 req.userId로 접근한다.
declare module 'express-serve-static-core' {
  interface Request {
    userId: number;
    role: string;
  }
}

interface JwtPayload {
  sub: number;
  role: string;
  iat: number;
  exp: number;
}

// jwt.verify 반환값의 클레임을 런타임에 검증한다.
// TypeScript 타입 단언만으로는 실제 페이로드 구조를 보장할 수 없다.
function assertJwtPayload(payload: unknown): asserts payload is JwtPayload {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !Number.isInteger((payload as Record<string, unknown>).sub) ||
    typeof (payload as Record<string, unknown>).role !== 'string'
  ) {
    throw new TokenInvalidError();
  }
}

// Authorization: Bearer <accessToken> 헤더를 검증하는 미들웨어.
// 토큰이 없거나 만료/변조된 경우 UnauthorizedError(401)를 던진다.
// 검증 성공 시 req.userId, req.role에 페이로드를 주입한다.
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  // JWT_ACCESS_SECRET 누락은 서버 설정 오류 → try/catch 밖에서 확인해 500으로 처리
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    next(new Error('JWT_ACCESS_SECRET is not defined'));
    return;
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authHeader.slice(7); // "Bearer " 이후 토큰 문자열

    // 만료, 서명 불일치 등은 jwt.verify가 에러를 throw한다.
    const payload: unknown = jwt.verify(token, secret);

    // 서명은 통과했어도 클레임 구조가 올바른지 런타임에 검증한다.
    assertJwtPayload(payload);

    req.userId = payload.sub;
    req.role = payload.role;

    next();
  } catch (error) {
    // 헤더에서 직접 throw한 UnauthorizedError는 그대로 전달
    if (error instanceof UnauthorizedError) {
      next(error);
      return;
    }
    // jwt 라이브러리가 던지는 에러 종류에 따라 구분해서 응답
    if (error instanceof jwt.TokenExpiredError) {
      // 서명은 유효하지만 만료된 토큰 → 클라이언트가 refresh 시도 가능
      next(new TokenExpiredError());
    } else {
      // JsonWebTokenError: 서명 불일치, 형식 오류 등 → 강제 재로그인
      next(new TokenInvalidError());
    }
  }
};
