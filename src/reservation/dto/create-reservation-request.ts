// POST /api/v1/reserve - 예약 생성 시 Request Body 검증 스키마
import { z } from 'zod';

export const CreateReservationRequest = z.object({
  proposalId: z.number().int().positive(),
  proposalTimeId: z.number().int().positive(),
});

export type CreateReservationRequestType = z.infer<typeof CreateReservationRequest>;
