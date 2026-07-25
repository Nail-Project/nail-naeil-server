import { afterEach, describe, expect, it, vi } from 'vitest';
import { NaverAuthClient } from '../../src/external/naver/naver-auth.client';

const client = () =>
  new NaverAuthClient(
    'naver-client-id',
    'naver-secret',
    'http://localhost:3000/api/auth/naver/callback',
  );

describe('NaverAuthClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('인가 URL에 client_id, redirect_uri, response_type, state를 담는다', () => {
    const url = new URL(client().getAuthorizationUrl('state-xyz'));

    expect(url.origin + url.pathname).toBe('https://nid.naver.com/oauth2.0/authorize');
    expect(url.searchParams.get('client_id')).toBe('naver-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/naver/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state-xyz');
  });

  it('code/state로 토큰을 교환하고 프로필을 반환한다 (nickname 우선, 없으면 name)', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          response: { id: 'naver-unique-1', email: 'user@naver.com', name: '김철수' },
        }),
      } as Response);

    const profile = await client().fetchProfile('auth-code', 'state-xyz');

    expect(profile).toEqual({
      providerId: 'naver-unique-1',
      email: 'user@naver.com',
      nickname: '김철수',
    });
  });

  it('프로필 응답에 id가 없으면 SocialProfileError를 던진다', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ response: {} }) } as Response);

    await expect(client().fetchProfile('auth-code', 'state-xyz')).rejects.toMatchObject({
      code: 'SOCIAL_PROFILE_FETCH_FAILED',
    });
  });
});
