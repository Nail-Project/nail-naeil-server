import { SocialAuthClient, SocialProfile } from '../social/social-auth.client';
import { SocialTokenExchangeError, SocialProfileError } from '../../user/error/social-auth.error';

const AUTH_BASE = 'https://nid.naver.com';
const API_BASE = 'https://openapi.naver.com';

interface NaverTokenResponse {
  access_token?: string;
}

interface NaverProfileResponse {
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
  };
}

export class NaverAuthClient implements SocialAuthClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    clientId = process.env.NAVER_CLIENT_ID,
    clientSecret = process.env.NAVER_CLIENT_SECRET,
    redirectUri = process.env.NAVER_REDIRECT_URI,
  ) {
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET / NAVER_REDIRECT_URI is not set');
    }
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthorizationUrl(state: string): string {
    const url = new URL(`${AUTH_BASE}/oauth2.0/authorize`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', this.redirectUri);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async fetchProfile(code: string, state: string): Promise<SocialProfile> {
    const accessToken = await this.exchangeToken(code, state);
    return this.getProfile(accessToken);
  }

  private async exchangeToken(code: string, state: string): Promise<string> {
    const url = new URL(`${AUTH_BASE}/oauth2.0/token`);
    url.searchParams.set('grant_type', 'authorization_code');
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('client_secret', this.clientSecret);
    url.searchParams.set('code', code);
    url.searchParams.set('state', state);

    let response: Response;
    try {
      response = await fetch(url);
    } catch (error) {
      throw new SocialTokenExchangeError({
        provider: 'NAVER',
        reason: 'network_error',
        cause: String(error),
      });
    }
    if (!response.ok) {
      throw new SocialTokenExchangeError({ provider: 'NAVER', status: response.status });
    }

    const data = (await response.json()) as NaverTokenResponse;
    if (!data.access_token) {
      throw new SocialTokenExchangeError({ provider: 'NAVER', reason: 'no_access_token' });
    }
    return data.access_token;
  }

  private async getProfile(accessToken: string): Promise<SocialProfile> {
    let response: Response;
    try {
      response = await fetch(`${API_BASE}/v1/nid/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      throw new SocialProfileError({
        provider: 'NAVER',
        reason: 'network_error',
        cause: String(error),
      });
    }
    if (!response.ok) {
      throw new SocialProfileError({ provider: 'NAVER', status: response.status });
    }

    const data = (await response.json()) as NaverProfileResponse;
    const profile = data.response;
    if (!profile?.id) {
      throw new SocialProfileError({ provider: 'NAVER', reason: 'no_id' });
    }
    return {
      providerId: profile.id,
      email: profile.email ?? null,
      nickname: profile.nickname ?? profile.name ?? null,
    };
  }
}
