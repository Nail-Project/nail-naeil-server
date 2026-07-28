import { getPrisma } from '../../infra/prisma';
import { AuthProvider } from '../../generated/prisma/client';

export class UserRepository {
  // LOCAL 인증수단을 loginId(providerId)로 조회한다 (user, passwordHash 포함).
  // 회원가입 중복검사와 로그인이 공유한다. 소셜 전용 유저는 LOCAL 수단이 없어 null.
  findLocalAuthByLoginId(loginId: string) {
    return getPrisma().userAuthProvider.findUnique({
      where: { provider_providerId: { provider: AuthProvider.LOCAL, providerId: loginId } },
      include: { user: true },
    });
  }

  // email은 더 이상 유니크 제약이 없으므로 best-effort 중복 검사에만 쓴다.
  findUserByEmail(email: string) {
    return getPrisma().user.findFirst({ where: { email } });
  }

  // 로컬 회원가입: User + LOCAL UserAuthProvider를 한 트랜잭션(중첩 create)으로 생성한다.
  createLocalUser(data: {
    loginId: string;
    passwordHash: string;
    email: string;
    phoneNumber: string;
  }) {
    return getPrisma().user.create({
      data: {
        email: data.email,
        phoneNumber: data.phoneNumber,
        authProviders: {
          create: {
            provider: AuthProvider.LOCAL,
            providerId: data.loginId,
            passwordHash: data.passwordHash,
          },
        },
      },
    });
  }

  // 소셜 로그인: (provider, providerId)로 기존 연결 조회
  findByProvider(provider: AuthProvider, providerId: string) {
    return getPrisma().userAuthProvider.findUnique({
      where: { provider_providerId: { provider, providerId } },
      include: { user: true },
    });
  }

  // 소셜 신규 가입: User + 소셜 UserAuthProvider 생성 (passwordHash 없음)
  createSocialUser(data: {
    provider: AuthProvider;
    providerId: string;
    email?: string | null;
    nickname?: string | null;
  }) {
    return getPrisma().user.create({
      data: {
        email: data.email ?? null,
        nickname: data.nickname ?? null,
        authProviders: {
          create: { provider: data.provider, providerId: data.providerId },
        },
      },
    });
  }

  // token 컬럼에는 원문이 아닌 SHA-256 해시만 저장한다.
  saveRefreshToken(userId: number, tokenHash: string, expiresAt: Date) {
    return getPrisma().refreshToken.create({ data: { userId, token: tokenHash, expiresAt } });
  }

  // deleteMany의 count로 원자적 consume 판정 (rotation 중복 발급 방지)
  deleteRefreshToken(tokenHash: string) {
    return getPrisma().refreshToken.deleteMany({ where: { token: tokenHash } });
  }
}
