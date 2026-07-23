import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '../../generated/prisma/client';
import { UserRepository } from '../repository/user.repository';
import { SignupUserRequest } from '../dto/signup-user-request';
import { LoginUserRequest } from '../dto/login-user-request';
import { SignupUserResponse } from '../dto/signup-user-response';
import { LoginUserResponse } from '../dto/login-user-response';
import {
  DuplicatedLoginIdError,
  DuplicatedEmailError,
  InvalidCredentialsError,
  InvalidTokenError,
} from '../error/user.error';

const SALT_ROUNDS = 10;

// 존재하지 않는 계정으로 로그인 시도 시에도 bcrypt.compare를 수행해
// 응답 시간 차이로 계정 존재 여부를 추론(계정 열거)할 수 없게 한다.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-attack-mitigation', SALT_ROUNDS);

export class UserAuthService {
  private readonly userRepository = new UserRepository();

  async signup(request: SignupUserRequest): Promise<SignupUserResponse> {
    if (await this.userRepository.findByLoginId(request.loginId)) {
      throw new DuplicatedLoginIdError();
    }
    if (await this.userRepository.findByEmail(request.email)) {
      throw new DuplicatedEmailError();
    }

    const hashedPassword = await bcrypt.hash(request.password, SALT_ROUNDS);

    // 사전 중복 검사 후에도 동시 요청 레이스로 유니크 제약(P2002) 위반이
    // 발생할 수 있으므로 도메인 에러로 매핑한다 (500 대신 409 응답).
    let user;
    try {
      user = await this.userRepository.create({
        loginId: request.loginId,
        password: hashedPassword,
        email: request.email,
        phoneNumber: request.phoneNumber,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const target = (error.meta?.target ?? '') as string;
        if (target.includes('email')) {
          throw new DuplicatedEmailError();
        }
        throw new DuplicatedLoginIdError();
      }
      throw error;
    }

    return {
      userId: user.id,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
    };
  }

  async login(request: LoginUserRequest): Promise<LoginUserResponse> {
    const user = await this.userRepository.findByLoginIdOrEmail(request.identifier);

    // 유저가 없어도 더미 해시와 비교해 응답 시간을 균등화한다.
    const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
    const isValid = await bcrypt.compare(request.password, passwordHash);
    if (!user || !isValid) {
      throw new InvalidCredentialsError();
    }

    const accessToken = this.issueAccessToken(user.id, user.role);
    const refreshToken = await this.issueAndStoreRefreshToken(user.id, user.role);
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<LoginUserResponse> {
    const tokenHash = this.hashToken(refreshToken);

    let payload: { sub: number; role: string };
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as unknown as {
        sub: number;
        role: string;
      };
    } catch {
      // 서명이 깨졌거나 만료된 토큰이 DB에 남아 있으면 정리
      await this.userRepository.deleteRefreshToken(tokenHash);
      throw new InvalidTokenError();
    }

    // rotation: 조회-삭제를 분리하지 않고 삭제(consume)를 원자적으로 수행,
    // 정확히 1건 삭제된 경우에만 재발급한다 (동시 요청 중복 발급 방지).
    const { count } = await this.userRepository.deleteRefreshToken(tokenHash);
    if (count !== 1) {
      throw new InvalidTokenError();
    }

    const accessToken = this.issueAccessToken(payload.sub, payload.role);
    const newRefreshToken = await this.issueAndStoreRefreshToken(payload.sub, payload.role);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.userRepository.deleteRefreshToken(this.hashToken(refreshToken));
  }

  // refresh token은 DB 유출 시 그대로 재사용 가능한 credential이므로
  // 원문 대신 SHA-256 해시만 저장/조회한다.
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private issueAccessToken(userId: number, role: string): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    const options: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign({ sub: userId, role }, secret, options);
  }

  private async issueAndStoreRefreshToken(userId: number, role: string): Promise<string> {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const options: jwt.SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '14d') as jwt.SignOptions['expiresIn'],
    };
    const token = jwt.sign({ sub: userId, role }, secret, options);

    const { exp } = jwt.decode(token) as { exp: number };
    await this.userRepository.saveRefreshToken(userId, this.hashToken(token), new Date(exp * 1000));
    return token;
  }
}
