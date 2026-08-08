import type { ReservationStatus } from '../../generated/prisma/enums';

// GET /api/v1/reserve/detail - 예약 목록 조회 성공 시 Response
export interface ReservationListItem {
  reservationId: number;
  proposalId: number;
  reservedAt: Date;
  status: ReservationStatus;
  shopName: string;
  // TODO: [malibu] Shop 도메인(B8) 개발 후 실제 컬럼으로 연결 예정
  shopThumbnailUrl: string | null;
  totalPrice: number | null;
  // 시술 부위 - EstimateRequest.nailType (HAND/PEDICURE/BOTH)
  nailType: string;
  // 제거 유무 - EstimateRequest.removalType
  removalType: string;
}

export interface ReservationPageInfo {
  nextCursor: string | null;
  hasNext: boolean;
}

export interface GetReservationsResponse {
  reservations: ReservationListItem[];
  pageInfo: ReservationPageInfo;
}
