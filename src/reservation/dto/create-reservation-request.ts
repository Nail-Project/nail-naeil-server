// POST /api/v1/reserve - 예약 생성 시 Request Body 검증 스키마
import { z } from 'zod';

// MySQL INT(signed 32bit) 컬럼 범위를 벗어나는 값은 DB 조회 전에 차단한다.
const MYSQL_INT_MAX = 2147483647;

export const CreateReservationRequest = z.object({
  proposalId: z.number().int().positive().max(MYSQL_INT_MAX),
  timeId: z.number().int().positive().max(MYSQL_INT_MAX),
});

export type CreateReservationRequestType = z.infer<typeof CreateReservationRequest>;
