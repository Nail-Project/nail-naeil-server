import type { ReservationStatus } from '../../generated/prisma/enums';

// POST /api/v1/reserve - 예약 생성 성공 시 Response
export interface CreateReservationResponse {
  reservationId: number;
  shopName: string;
  reservedAt: Date;
  totalPrice: number | null;
  status: ReservationStatus;
}
