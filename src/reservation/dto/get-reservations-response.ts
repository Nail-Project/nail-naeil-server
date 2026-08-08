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
  // 카탈로그 디자인 그대로 견적받은 예약만 값이 있다. 직접 사진을 올려 요청한 예약은 null.
  designName: string | null;
  // designName이 null이면(직접 사진 업로드) 항상 빈 배열.
  designTags: string[];
}

export interface ReservationPageInfo {
  nextCursor: string | null;
  hasNext: boolean;
}

export interface GetReservationsResponse {
  reservations: ReservationListItem[];
  pageInfo: ReservationPageInfo;
}
