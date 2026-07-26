import type { ReservationStatus } from '../../generated/prisma/enums';

// GET /api/v1/reserve/:reservationId - 예약 상세 조회 성공 시 Response
export interface GetReservationDetailResponse {
  reservationId: number;
  shopName: string;
  address: string;
  reservedAt: Date;
  totalPrice: number;
  status: ReservationStatus;
  // TODO: [malibu] Design 모델 추가 후 연결 예정
  designName: string | null;
}
