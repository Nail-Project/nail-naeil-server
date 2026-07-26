// 소셜 provider(카카오/네이버) 공통 인증 클라이언트 계약.
// 각 provider 클라이언트는 인가 URL 생성과 (code → 토큰 교환 → 프로필 조회)를 담당한다.

export interface SocialProfile {
  // 각 소셜의 고유 회원 식별자 (UserAuthProvider.providerId로 저장)
  providerId: string;
  email: string | null;
  nickname: string | null;
}

export interface SocialAuthClient {
  getAuthorizationUrl(state: string): string;
  // 인가 코드로 토큰을 교환하고 사용자 프로필을 조회한다.
  fetchProfile(code: string, state: string): Promise<SocialProfile>;
}
