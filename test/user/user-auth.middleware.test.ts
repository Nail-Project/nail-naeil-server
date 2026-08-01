import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { authenticate } from '../../src/user/middlewares/user-auth.middleware';
import { InvalidTokenError } from '../../src/user/error/user.error';

const SECRET = 'test-access-secret';

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = SECRET;
});

// authorization 헤더만 흉내 내는 최소 Request 객체
const mockReq = (authorization?: string): Request =>
  ({
    header: (name: string) => (name.toLowerCase() === 'authorization' ? authorization : undefined),
  }) as unknown as Request;

const res = {} as Response;

describe('authenticate 미들웨어', () => {
  it('유효한 Bearer 토큰이면 req에 userId/role을 싣고 에러 없이 next를 호출한다', () => {
    const token = jwt.sign({ sub: 42, role: 'CUSTOMER' }, SECRET);
    const req = mockReq(`Bearer ${token}`);
    const next = vi.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.userId).toBe(42);
    expect(req.role).toBe('CUSTOMER');
  });

  it('Authorization 헤더가 없으면 InvalidTokenError(401)로 next를 호출한다', () => {
    const next = vi.fn();

    authenticate(mockReq(undefined), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(InvalidTokenError));
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_TOKEN', statusCode: 401 }),
    );
  });

  it('Bearer 접두사가 없으면 InvalidTokenError로 next를 호출한다', () => {
    const next = vi.fn();

    authenticate(mockReq('Token abc.def.ghi'), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(InvalidTokenError));
  });

  it('서명이 잘못된 토큰이면 InvalidTokenError로 next를 호출한다', () => {
    const token = jwt.sign({ sub: 1, role: 'CUSTOMER' }, 'wrong-secret');
    const next = vi.fn();

    authenticate(mockReq(`Bearer ${token}`), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(InvalidTokenError));
  });
});
