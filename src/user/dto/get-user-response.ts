// GET /api/v1/users/me 응답 DTO
// Prisma User 모델을 그대로 노출하지 않고, 외부에 안전한 프로필 필드만 반환한다.
export class GetUserResponse {
  userId!: number;
  email!: string | null;
  phoneNumber!: string | null;
  nickname!: string | null;
  profileImageUrl!: string | null;
  role!: string;
}
