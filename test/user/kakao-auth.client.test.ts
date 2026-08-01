import { afterEach, describe, expect, it, vi } from 'vitest';
import { KakaoAuthClient } from '../../src/external/kakao/kakao-auth.client';

const client = () =>
  new KakaoAuthClient(
    'rest-api-key',
    'client-secret',
    'http://localhost:3000/api/v1/auth/kakao/callback',
  );

describe('KakaoAuthClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인가 URL에 client_id, redirect_uri, response_type, state를 담는다', () => {
    const url = new URL(client().getAuthorizationUrl('state-123'));

    expect(url.origin + url.pathname).toBe('https://kauth.kakao.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('rest-api-key');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/v1/auth/kakao/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-123');
  });

  it('code로 토큰을 교환하고 프로필(providerId/email/nickname)을 반환한다', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 4823094,
          kakao_account: { email: 'user@kakao.com', profile: { nickname: '홍길동' } },
        }),
      } as Response);

    const profile = await client().fetchProfile('auth-code');

    expect(profile).toEqual({
      providerId: '4823094',
      email: 'user@kakao.com',
      nickname: '홍길동',
    });
  });

  it('토큰 교환 응답이 실패하면 SocialTokenExchangeError를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    await expect(client().fetchProfile('bad-code')).rejects.toMatchObject({
      code: 'SOCIAL_TOKEN_EXCHANGE_FAILED',
    });
  });

  it('프로필 응답에 id가 없으면 SocialProfileError를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ kakao_account: {} }) } as Response);

    await expect(client().fetchProfile('auth-code')).rejects.toMatchObject({
      code: 'SOCIAL_PROFILE_FETCH_FAILED',
    });
  });
});
