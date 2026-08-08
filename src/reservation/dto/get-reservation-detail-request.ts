// GET /api/v1/reserve/:reservationId - 예약 상세 조회 시 Path Variable 검증 스키마
import { z } from 'zod';

// Reservation.id는 BigInt 컬럼이라 MySQL INT 상한이 아니라, JS Number로 안전하게
// 표현 가능한 범위(정밀도 손실 없는 safe integer)까지만 허용한다.
export const GetReservationDetailRequest = z.object({
  reservationId: z.string().transform(Number).pipe(z.number().int().positive().safe()),
});
