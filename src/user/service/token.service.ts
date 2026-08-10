import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repository/user.repository';
import { InternalServerError } from '../../common/errors/common.error';

// access/refresh 토큰 발급 및 refresh token 저장을 담당한다.
// 로컬 로그인(UserAuthService)과 소셜 로그인(SocialAuthService)이 공유한다.
export class TokenService {
  constructor(private readonly userRepository = new UserRepository()) {}

  async issueTokens(
    userId: number,
    role: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = this.issueAccessToken(userId, role);
    const refreshToken = await this.issueAndStoreRefreshToken(userId, role);
    return { accessToken, refreshToken };
  }

  issueAccessToken(userId: number, role: string): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      // server.ts가 부팅 시 fail-fast로 이미 걸러내지만, 컨벤션(공통 AppError throw)을
      // 지키기 위해 방어적으로도 AppError를 던진다.
      throw new InternalServerError();
    }

    const options: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign({ sub: userId, role }, secret, options);
  }

  async issueAndStoreRefreshToken(userId: number, role: string): Promise<string> {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      // server.ts가 부팅 시 fail-fast로 이미 걸러내지만, 컨벤션(공통 AppError throw)을
      // 지키기 위해 방어적으로도 AppError를 던진다.
      throw new InternalServerError();
    }

    const options: jwt.SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '14d') as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign({ sub: userId, role }, secret, options);

    const { exp } = jwt.decode(token) as { exp: number };
    await this.userRepository.saveRefreshToken(userId, this.hashToken(token), new Date(exp * 1000));
    return token;
  }

  // refresh token은 DB 유출 시 그대로 재사용 가능한 credential이므로
  // 원문 대신 SHA-256 해시만 저장/조회한다.
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
