import { SocialAuthClient, SocialProfile } from '../social/social-auth.client';
import { SocialTokenExchangeError, SocialProfileError } from '../../user/error/social-auth.error';

const AUTH_BASE = 'https://kauth.kakao.com';
const API_BASE = 'https://kapi.kakao.com';
const TIMEOUT_MS = 10_000;

// 카카오 서버 응답이 지연될 때 요청이 무한 대기하지 않도록 타임아웃을 건다.
// fetch()가 resolve된 직후(응답 헤더 도착 시점)에 바로 clearTimeout하면 본문을 읽는
// response.json() 구간은 타임아웃 보호를 못 받으므로, onResponse(본문 파싱까지)가
// 끝날 때까지 타이머를 유지한다.
const fetchWithTimeout = async <T>(
  input: string,
  init: RequestInit | undefined,
  onResponse: (response: Response) => Promise<T>,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    return await onResponse(response);
  } finally {
    clearTimeout(timeoutId);
  }
};

interface KakaoTokenResponse {
  access_token?: string;
}

interface KakaoProfileResponse {
  id?: number;
  kakao_account?: {
    email?: string;
    profile?: { nickname?: string };
  };
}

export class KakaoAuthClient implements SocialAuthClient {
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly redirectUri: string;

  constructor(
    clientId = process.env.KAKAO_CLIENT_ID,
    clientSecret = process.env.KAKAO_CLIENT_SECRET,
    redirectUri = process.env.KAKAO_REDIRECT_URI,
  ) {
    if (!clientId || !redirectUri) {
      throw new Error('KAKAO_CLIENT_ID / KAKAO_REDIRECT_URI is not set');
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state: string): string {
    const url = new URL(`${AUTH_BASE}/oauth/authorize`);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    return url.toString();
  }

  async fetchProfile(code: string): Promise<SocialProfile> {
    const accessToken = await this.exchangeToken(code);
    return this.getProfile(accessToken);
  }

  private async exchangeToken(code: string): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      code,
    });
    if (this.clientSecret) {
      body.set('client_secret', this.clientSecret);
    }

    let data: KakaoTokenResponse;
    try {
      data = await fetchWithTimeout(
        `${AUTH_BASE}/oauth/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        },
        async (response) => {
          if (!response.ok) {
            throw new SocialTokenExchangeError({ provider: 'KAKAO', status: response.status });
          }
          return (await response.json()) as KakaoTokenResponse;
        },
      );
    } catch (error) {
      if (error instanceof SocialTokenExchangeError) throw error;
      throw new SocialTokenExchangeError({
        provider: 'KAKAO',
        reason: 'network_error',
        cause: String(error),
      });
    }
    if (!data.access_token) {
      throw new SocialTokenExchangeError({ provider: 'KAKAO', reason: 'no_access_token' });
    }
    return data.access_token;
  }

  private async getProfile(accessToken: string): Promise<SocialProfile> {
    let data: KakaoProfileResponse;
    try {
      data = await fetchWithTimeout(
        `${API_BASE}/v2/user/me`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
        async (response) => {
          if (!response.ok) {
            throw new SocialProfileError({ provider: 'KAKAO', status: response.status });
          }
          return (await response.json()) as KakaoProfileResponse;
        },
      );
    } catch (error) {
      if (error instanceof SocialProfileError) throw error;
      throw new SocialProfileError({
        provider: 'KAKAO',
        reason: 'network_error',
        cause: String(error),
      });
    }
    if (data.id === undefined || data.id === null) {
      throw new SocialProfileError({ provider: 'KAKAO', reason: 'no_id' });
    }
    return {
      providerId: String(data.id),
      email: data.kakao_account?.email ?? null,
      nickname: data.kakao_account?.profile?.nickname ?? null,
    };
  }
}
