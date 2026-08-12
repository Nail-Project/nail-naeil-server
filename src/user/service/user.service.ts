import { UserRepository } from '../repository/user.repository';
import { GetUserResponse } from '../dto/get-user-response';
import { UpdateUserRequest } from '../dto/update-user-request';
import { DuplicatedEmailError, UserNotFoundError } from '../error/user.error';
import { EstimateRequestService } from '../../estimate-request/service/estimate-request.service';
import { ReservationService } from '../../reservation/service/reservation.service';
import { SubscriptionService } from '../../subscription/service/subscription.service';

// 응답 조립에 필요한 User의 최소 필드만 추린 타입(Prisma User 레코드가 구조적으로 만족한다).
type UserProfileRecord = {
  id: number;
  email: string | null;
  phoneNumber: string | null;
  nickname: string | null;
  profileImageUrl: string | null;
  role: string;
};

// 마이페이지(내 정보 조회/수정/탈퇴) 비즈니스 로직을 담당한다.
export class UserService {
  // 테스트에서 fake repository/서비스를 주입할 수 있도록 기본값과 함께 생성자로 받는다
  // (TokenService와 동일한 패턴). 요약 수치는 각 도메인 서비스를 통해 조회한다(아키텍처 규칙: 타 도메인 Repository 직접 접근 금지).
  constructor(
    private readonly userRepository = new UserRepository(),
    private readonly estimateRequestService = new EstimateRequestService(),
    private readonly reservationService = new ReservationService(),
    private readonly subscriptionService = new SubscriptionService(),
  ) {}

  async getMyProfile(userId: number): Promise<GetUserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    return this.buildProfileResponse(user);
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
    return this.buildProfileResponse(updated);
  }

  async deleteAccount(userId: number): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError();
    }

    await this.userRepository.deleteUserWithTokens(userId);
  }

  // 프로필 기본 정보에 마이페이지 요약(진행 중 견적 수·다가오는 예약 수·NPlus 여부)을 더해 응답을 만든다.
  // 세 조회는 서로 독립적이라 병렬로 처리한다.
  private async buildProfileResponse(user: UserProfileRecord): Promise<GetUserResponse> {
    const [inProgressEstimateCount, upcomingReservationCount, isNPlus] = await Promise.all([
      this.estimateRequestService.countInProgress(user.id),
      this.reservationService.countUpcoming(user.id),
      this.subscriptionService.isNPlus(user.id),
    ]);

    return {
      userId: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      inProgressEstimateCount,
      upcomingReservationCount,
      isNPlus,
    };
  }
}
