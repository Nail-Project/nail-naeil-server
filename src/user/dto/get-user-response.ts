// GET /api/v1/users/me 응답 DTO
// Prisma User 모델을 그대로 노출하지 않고, 외부에 안전한 프로필 필드만 반환한다.
export class GetUserResponse {
  userId!: number;
  email!: string | null;
  phoneNumber!: string | null;
  nickname!: string | null;
  profileImageUrl!: string | null;
  role!: string;
  // 진행 중(샵 매칭 중, status=MATCHING)인 견적 요청 수.
  inProgressEstimateCount!: number;
  // 다가오는(CONFIRMED + 예약 시각 미도래) 예약 수.
  upcomingReservationCount!: number;
  // NPlus 구독 가입 여부(ACTIVE이면서 만료되지 않은 구독 존재 여부).
  isNPlus!: boolean;
}
