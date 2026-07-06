import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from './user.repository';
import { SignupUserRequest } from './dto/signup-user-request';
import { LoginUserRequest } from './dto/login-user-request';
import { SignupUserResponse } from './dto/signup-user-response';
import { LoginUserResponse } from './dto/login-user-response';
import {
  DuplicatedLoginIdError,
  DuplicatedEmailError,
  InvalidCredentialsError,
} from '../common/errors/user-errors.ts';

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

    return { accessToken: this.issueAccessToken(user.id, user.role) };
  }

  private issueAccessToken(userId: number, role: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const options: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as jwt.SignOptions['expiresIn'],
    };
    return jwt.sign({ sub: userId, role }, secret, options);
  }
}