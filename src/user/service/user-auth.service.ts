import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
} from '../../common/errors/user-errors';

const SALT_ROUNDS = 10;

export class UserAuthService {
  private readonly userRepository = new UserRepository();

  async signup(request: SignupUserRequest): Promise<SignupUserResponse> {
    if (await this.userRepository.findByLoginId(request.loginId)) {
      throw DuplicatedLoginIdError();
    }
    if (await this.userRepository.findByEmail(request.email)) {
      throw DuplicatedEmailError();
    }

    const hashedPassword = await bcrypt.hash(request.password, SALT_ROUNDS);
    const user = await this.userRepository.create({
      loginId: request.loginId,
      password: hashedPassword,
      email: request.email,
      phoneNumber: request.phoneNumber,
    });

    return {
      userId: user.id,
      loginId: user.loginId,
      email: user.email,
      role: user.role,
    };
  }

  async login(request: LoginUserRequest): Promise<LoginUserResponse> {
    const user = await this.userRepository.findByLoginIdOrEmail(request.identifier);
    if (!user) {
      throw InvalidCredentialsError();
    }

    const isValid = await bcrypt.compare(request.password, user.password);
    if (!isValid) {
      throw InvalidCredentialsError();
    }

    const accessToken = this.issueAccessToken(user.id, user.role);
    const refreshToken = await this.issueAndStoreRefreshToken(user.id, user.role);
    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<LoginUserResponse> {
    const stored = await this.userRepository.findRefreshToken(refreshToken);
    if (!stored) {
      throw InvalidTokenError();
    }

    let payload: { sub: number; role: string };
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as unknown as {
        sub: number;
        role: string;
      };
    } catch {
      await this.userRepository.deleteRefreshToken(refreshToken);
      throw InvalidTokenError();
    }

    // rotation: 쓴 refresh는 폐기하고 새로 발급
    await this.userRepository.deleteRefreshToken(refreshToken);
    const accessToken = this.issueAccessToken(payload.sub, payload.role);
    const newRefreshToken = await this.issueAndStoreRefreshToken(payload.sub, payload.role);
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.userRepository.deleteRefreshToken(refreshToken);
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
    await this.userRepository.saveRefreshToken(userId, token, new Date(exp * 1000));
    return token;
  }
}