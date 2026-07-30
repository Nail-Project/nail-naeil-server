import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { InvalidTokenError } from '../error/user.error';

// Authorization: Bearer <accessToken> 헤더를 검증하고
// payload의 sub(userId)/role을 req에 실어 다음 핸들러로 넘긴다.
// 토큰 발급은 TokenService.issueAccessToken이 { sub, role }로 서명한다.
export const authenticate: RequestHandler = (req, _res, next) => {
  try {
    const header = req.header('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new InvalidTokenError();
    }

    const token = header.slice(7);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    const payload = jwt.verify(token, secret) as unknown as { sub: number; role: string };
    req.userId = payload.sub;
    req.role = payload.role;
    next();
  } catch {
    next(new InvalidTokenError());
  }
};
