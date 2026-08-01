import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../../src/user/repository/user.repository';
import { UserAuthService } from '../../src/user/service/user-auth.service';
import type { TokenService } from '../../src/user/service/token.service';

const REFRESH_SECRET = 'test-refresh-secret';

const createService = (deleteRefreshToken: ReturnType<typeof vi.fn>) => {
  const repository = { deleteRefreshToken } as unknown as UserRepository;
  const tokenService = {
    hashToken: vi.fn().mockReturnValue('refresh-token-hash'),
    issueTokens: vi.fn(),
  } as unknown as TokenService;

  return new UserAuthService(repository, tokenService);
};

describe('UserAuthService.refresh', () => {
  beforeEach(() => {
    vi.stubEnv('JWT_REFRESH_SECRET', REFRESH_SECRET);
  });

  it('만료된 refresh token은 TOKEN_EXPIRED(401)로 응답한다', async () => {
    const token = jwt.sign({ sub: 1, role: 'CUSTOMER' }, REFRESH_SECRET, { expiresIn: -1 });
    const deleteRefreshToken = vi.fn().mockResolvedValue({ count: 1 });

    await expect(createService(deleteRefreshToken).refresh(token)).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
      statusCode: 401,
    });
    expect(deleteRefreshToken).toHaveBeenCalledWith('refresh-token-hash');
  });

  it('서명이나 형식이 유효하지 않은 refresh token은 TOKEN_INVALID(401)로 응답한다', async () => {
    const deleteRefreshToken = vi.fn().mockResolvedValue({ count: 0 });

    await expect(createService(deleteRefreshToken).refresh('invalid-token')).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      statusCode: 401,
    });
    expect(deleteRefreshToken).toHaveBeenCalledWith('refresh-token-hash');
  });

  it('검증은 통과했지만 저장소에 없는 refresh token은 TOKEN_INVALID(401)로 응답한다', async () => {
    const token = jwt.sign({ sub: 1, role: 'CUSTOMER' }, REFRESH_SECRET, { expiresIn: '1h' });
    const deleteRefreshToken = vi.fn().mockResolvedValue({ count: 0 });

    await expect(createService(deleteRefreshToken).refresh(token)).rejects.toMatchObject({
      code: 'TOKEN_INVALID',
      statusCode: 401,
    });
    expect(deleteRefreshToken).toHaveBeenCalledWith('refresh-token-hash');
  });
});
