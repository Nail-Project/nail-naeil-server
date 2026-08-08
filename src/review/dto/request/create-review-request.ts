// POST /api/v1/reviews - Request Body 검증 스키마
import { z } from 'zod';

export const CreateReviewRequest = z.object({
  // Reservation.id는 BigInt 컬럼이라 MySQL INT 상한이 아니라, JS Number로 안전하게
  // 표현 가능한 범위(정밀도 손실 없는 safe integer)까지만 허용한다.
  reservationId: z.number().int().positive().safe(),
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(1000),
});

export type CreateReviewRequestType = z.infer<typeof CreateReviewRequest>;
