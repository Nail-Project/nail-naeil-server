// DELETE /api/v1/reserve/:reservationId - 예약 취소 시 Request Body 검증 스키마
import { z } from 'zod';

// Figma의 취소 사유 라디오("개인 사정으로 인해 취소할게요" 등 4개)는 자유 문자열로 받는다 -
// "기타" 선택 시 자유 입력이 가능해서 고정 enum으로 강제하지 않는다.
export const CancelReservationRequest = z.object({
  reason: z.string().trim().min(1).max(255),
});

export type CancelReservationRequestType = z.infer<typeof CancelReservationRequest>;
