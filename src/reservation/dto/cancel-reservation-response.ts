import type { ReservationStatus } from '../../generated/prisma/enums';

// DELETE /api/v1/reserve/:reservationId - 예약 취소 성공 시 Response
export interface CancelReservationResponse {
  reservationId: number;
  status: ReservationStatus;
  cancelReason: string | null;
}
