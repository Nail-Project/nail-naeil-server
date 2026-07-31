import { UserRepository } from '../repository/user.repository';
import { GetUserResponse } from '../dto/get-user-response';
import { UpdateUserRequest } from '../dto/update-user-request';
import { DuplicatedEmailError, UserNotFoundError } from '../error/user.error';

// 마이페이지(내 정보 조회/수정/탈퇴) 비즈니스 로직을 담당한다.
export class UserService {
  // 테스트에서 fake repository를 주입할 수 있도록 기본값과 함께 생성자로 받는다
  // (TokenService와 동일한 패턴).
  constructor(private readonly userRepository = new UserRepository()) {}

  async getMyProfile(userId: number): Promise<GetUserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      role: user.role,
    };
  }

  async updateMyProfile(userId: number, request: UpdateUserRequest): Promise<GetUserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    // email은 유니크 제약이 없으므로, 본인 외 사용자가 쓰고 있으면 best-effort로 중복 처리한다.
    if (request.email && request.email !== user.email) {
      const existing = await this.userRepository.findUserByEmail(request.email);
      if (existing && existing.id !== userId) {
        throw new DuplicatedEmailError();
      }
    }

    const updated = await this.userRepository.updateUser(userId, request);
    return {
      userId: updated.id,
      email: updated.email,
      phoneNumber: updated.phoneNumber,
      nickname: updated.nickname,
      role: updated.role,
    };
  }

  async deleteAccount(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    await this.userRepository.deleteUserWithTokens(userId);
  }
}
