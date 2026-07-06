import { prisma } from '../config/prisma';

export class UserRepository {
  findByLoginId(loginId: string) {
    return prisma.user.findUnique({ where: { loginId } });
  }

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  // 로그인: loginId 또는 email 중 하나로 조회
  findByLoginIdOrEmail(identifier: string) {
    return prisma.user.findFirst({
      where: { OR: [{ loginId: identifier }, { email: identifier }] },
    });
  }

  create(data: {
    loginId: string;
    password: string;
    email: string;
    phoneNumber: string;
  }) {
    return prisma.user.create({ data });
  }
}