import { getPrisma } from '../../infra/prisma';
import { AuthProvider } from '../../generated/prisma/client';

export class UserRepository {
  // 로컬 회원가입 중복 검사: LOCAL provider의 loginId(providerId)로 조회
  findLocalByLoginId(loginId: string) {
    return getPrisma().userAuthProvider.findUnique({
      where: { provider_providerId: { provider: AuthProvider.LOCAL, providerId: loginId } },
      include: { user: true },
    });
  }

  // 로그인: loginId 또는 email 중 하나로 LOCAL 인증수단을 조회한다 (passwordHash 포함).
  // 소셜 전용 유저는 LOCAL 인증수단이 없어 여기서 null이 반환된다.
  findLocalAuthByIdentifier(identifier: string) {
    return getPrisma().userAuthProvider.findFirst({
      where: {
        provider: AuthProvider.LOCAL,
        OR: [{ providerId: identifier }, { user: { email: identifier } }],
      },
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

  // 마이페이지 조회: id로 User 단건 조회 (없으면 null)
  findById(userId: number) {
    return getPrisma().user.findUnique({ where: { id: userId } });
  }

  // 회원정보 수정: 전달된 필드만 부분 갱신
  updateUser(userId: number, data: { email?: string; profileImageUrl?: string }) {
    return getPrisma().user.update({ where: { id: userId }, data });
  }

  // 회원 탈퇴: RefreshToken은 onDelete Cascade가 없어 User 삭제 전에 먼저 지워야
  // FK 제약 위반을 피할 수 있다. UserAuthProvider는 Cascade라 자동 삭제된다.
  // 두 삭제를 한 트랜잭션으로 묶어 원자적으로 처리한다.
  deleteUserWithTokens(userId: number) {
    return getPrisma().$transaction([
      getPrisma().refreshToken.deleteMany({ where: { userId } }),
      getPrisma().user.delete({ where: { id: userId } }),
    ]);
  }
}
