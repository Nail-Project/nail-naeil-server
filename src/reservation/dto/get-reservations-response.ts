import type { ReservationStatus } from '../../generated/prisma/enums';

// GET /api/v1/reserve/detail - 예약 목록 조회 성공 시 Response
export interface ReservationListItem {
  reservationId: number;
  reservedAt: Date;
  status: ReservationStatus;
  shopName: string;
  // TODO: [malibu] Design 모델 추가 후 연결 예정
  designName: string | null;
  // TODO: [malibu] EstimateRequest 모델(feat/estimate_request) 병합 후 연결 예정
  thumbnailUrl: string | null;
  totalPrice: number;
}

export interface GetReservationsResponse {
  reservations: ReservationListItem[];
  page: number;
  totalElements: number;
}
