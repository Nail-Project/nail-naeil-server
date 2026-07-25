import crypto from 'node:crypto';
import { AuthProvider } from '../../generated/prisma/client';
import { UserRepository } from '../repository/user.repository';
import { TokenService } from './token.service';
import { KakaoAuthClient } from '../../external/kakao/kakao-auth.client';
import { NaverAuthClient } from '../../external/naver/naver-auth.client';
import { SocialAuthClient } from '../../external/social/social-auth.client';
import { LoginUserResponse } from '../dto/login-user-response';
import { UnsupportedProviderError } from '../error/social-auth.error';

export type SocialProviderKey = 'kakao' | 'naver';

export class SocialAuthService {
  private readonly userRepository = new UserRepository();
  private readonly tokenService = new TokenService(this.userRepository);

  // provider 클라이언트는 호출 시점에 생성한다(env 미설정 시 앱 부팅이 아니라 요청 처리 중 오류).
  private readonly clientFactories: Record<SocialProviderKey, () => SocialAuthClient> = {
    kakao: () => new KakaoAuthClient(),
    naver: () => new NaverAuthClient(),
  };

  private readonly providerEnums: Record<SocialProviderKey, AuthProvider> = {
    kakao: AuthProvider.KAKAO,
    naver: AuthProvider.NAVER,
  };

  // CSRF 방지용 state 값 생성
  generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  getAuthorizationUrl(provider: SocialProviderKey, state: string): string {
    return this.getClient(provider).getAuthorizationUrl(state);
  }

  // 인가 코드로 프로필을 조회한 뒤, 기존 연결이면 로그인 / 신규면 가입하고 JWT를 발급한다.
  async handleCallback(
    provider: SocialProviderKey,
    code: string,
    state: string,
  ): Promise<LoginUserResponse> {
    const profile = await this.getClient(provider).fetchProfile(code, state);
    const providerEnum = this.providerEnums[provider];

    const existing = await this.userRepository.findByProvider(providerEnum, profile.providerId);
    if (existing) {
      return this.tokenService.issueTokens(existing.user.id, existing.user.role);
    }

    const user = await this.userRepository.createSocialUser({
      provider: providerEnum,
      providerId: profile.providerId,
      email: profile.email,
      nickname: profile.nickname,
    });
    return this.tokenService.issueTokens(user.id, user.role);
  }

  private getClient(provider: SocialProviderKey): SocialAuthClient {
    const factory = this.clientFactories[provider];
    if (!factory) {
      throw new UnsupportedProviderError({ provider });
    }
    return factory();
  }
}
