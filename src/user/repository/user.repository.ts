import { getPrisma } from '../../infra/prisma';

export class UserRepository {
  findByLoginId(loginId: string) {
    return getPrisma().user.findUnique({ where: { loginId } });
  }

  findByEmail(email: string) {
    return getPrisma().user.findUnique({ where: { email } });
  }

  // 로그인: loginId 또는 email 중 하나로 조회
  findByLoginIdOrEmail(identifier: string) {
    return getPrisma().user.findFirst({
      where: { OR: [{ loginId: identifier }, { email: identifier }] },
    });
  }

  create(data: { loginId: string; password: string; email: string; phoneNumber: string }) {
    return getPrisma().user.create({ data });
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
