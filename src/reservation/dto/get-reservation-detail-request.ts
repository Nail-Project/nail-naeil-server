// GET /api/v1/reserve/:reservationId - 예약 상세 조회 시 Path Variable + Query String 검증 스키마
import { z } from 'zod';

// Reservation.id는 BigInt 컬럼이라 MySQL INT 상한이 아니라, JS Number로 안전하게
// 표현 가능한 범위(정밀도 손실 없는 safe integer)까지만 허용한다.
export const GetReservationDetailRequest = z
  .object({
    reservationId: z.string().transform(Number).pipe(z.number().int().positive().safe()),
    // 샵과의 거리 계산용 "지금 사용자 위치" - 둘 다 없으면 distanceMeters는 null.
    latitude: z
      .string()
      .trim()
      .min(1)
      .transform(Number)
      .pipe(z.number().min(-90).max(90))
      .optional(),
    longitude: z
      .string()
      .trim()
      .min(1)
      .transform(Number)
      .pipe(z.number().min(-180).max(180))
      .optional(),
  })
  .refine((data) => (data.latitude === undefined) === (data.longitude === undefined), {
    message: '위도와 경도는 함께 입력해야 합니다.',
    path: ['latitude'],
  });
