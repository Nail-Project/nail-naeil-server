import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Prisma } from '../../generated/prisma/client';
import { UserRepository } from '../repository/user.repository';
import { TokenService } from './token.service';
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
  private readonly tokenService = new TokenService(this.userRepository);

  async signup(request: SignupUserRequest): Promise<SignupUserResponse> {
    if (await this.userRepository.findLocalByLoginId(request.loginId)) {
      throw new DuplicatedLoginIdError();
    }
    // email은 유니크 제약이 없으므로 best-effort 사전 검사만 수행한다.
    if (await this.userRepository.findUserByEmail(request.email)) {
      throw new DuplicatedEmailError();
    }

    const hashedPassword = await bcrypt.hash(request.password, SALT_ROUNDS);

    // 사전 검사 후에도 동시 요청 레이스로 (provider, providerId) 유니크 제약(P2002)
    // 위반이 발생할 수 있으므로 loginId 중복 에러로 매핑한다 (500 대신 409 응답).
    let user;
    try {
      user = await this.userRepository.createLocalUser({
        loginId: request.loginId,
        passwordHash: hashedPassword,
        email: request.email,
        phoneNumber: request.phoneNumber,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicatedLoginIdError();
      }
      throw error;
    }

    return {
      userId: user.id,
      loginId: request.loginId,
      email: user.email ?? request.email,
      role: user.role,
    };
  }

  async login(request: LoginUserRequest): Promise<LoginUserResponse> {
    const auth = await this.userRepository.findLocalAuthByIdentifier(request.identifier);

    // 인증수단이 없어도 더미 해시와 비교해 응답 시간을 균등화한다(계정 열거 방지).
    const passwordHash = auth?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const isValid = await bcrypt.compare(request.password, passwordHash);
    if (!auth || !auth.passwordHash || !isValid) {
      throw new InvalidCredentialsError();
    }

    return this.tokenService.issueTokens(auth.user.id, auth.user.role);
  }

  async refresh(refreshToken: string): Promise<LoginUserResponse> {
    const tokenHash = this.tokenService.hashToken(refreshToken);

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

    return this.tokenService.issueTokens(payload.sub, payload.role);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.userRepository.deleteRefreshToken(this.tokenService.hashToken(refreshToken));
  }
}
