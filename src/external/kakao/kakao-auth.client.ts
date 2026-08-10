import { SocialAuthClient, SocialProfile } from '../social/social-auth.client';
import { SocialTokenExchangeError, SocialProfileError } from '../../user/error/social-auth.error';

const AUTH_BASE = 'https://kauth.kakao.com';
const API_BASE = 'https://kapi.kakao.com';
const TIMEOUT_MS = 10_000;

// 카카오 서버 응답이 지연될 때 요청이 무한 대기하지 않도록 타임아웃을 건다.
// (sbiz-shop.client.ts와 동일한 AbortController 패턴)
const fetchWithTimeout = async (input: string, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
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

    let response: Response;
    try {
      response = await fetchWithTimeout(`${AUTH_BASE}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (error) {
      throw new SocialTokenExchangeError({
        provider: 'KAKAO',
        reason: 'network_error',
        cause: String(error),
      });
    }
    if (!response.ok) {
      throw new SocialTokenExchangeError({ provider: 'KAKAO', status: response.status });
    }

    const data = (await response.json()) as KakaoTokenResponse;
    if (!data.access_token) {
      throw new SocialTokenExchangeError({ provider: 'KAKAO', reason: 'no_access_token' });
    }
    return data.access_token;
  }

  private async getProfile(accessToken: string): Promise<SocialProfile> {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${API_BASE}/v2/user/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      throw new SocialProfileError({
        provider: 'KAKAO',
        reason: 'network_error',
        cause: String(error),
      });
    }
    if (!response.ok) {
      throw new SocialProfileError({ provider: 'KAKAO', status: response.status });
    }

    const data = (await response.json()) as KakaoProfileResponse;
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
