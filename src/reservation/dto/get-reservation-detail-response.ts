import type { ReservationStatus } from '../../generated/prisma/enums';

// GET /api/v1/reserve/:reservationId - 예약 상세 조회 성공 시 Response
export interface GetReservationDetailResponse {
  reservationId: number;
  shopName: string;
  address: string;
  reservedAt: Date;
  // 견적서 세부내역 - EstimateResponse에 이미 저장돼 있던 값을 그대로 노출한다.
  // Figma의 "디자인 추가"/"옵션 추가" 라벨과 정확히 어떤 필드가 대응하는지는
  // 기획 확인이 필요해서(2026-08-03), 우선 실제 컬럼명 그대로 내려준다.
  basePrice: number;
  removalPrice: number;
  extraPrice: number;
  totalPrice: number;
  // 샵이 견적 응답 시 남긴 코멘트 - EstimateResponse.memo
  shopComment: string | null;
  // 시술 부위 - EstimateRequest.nailType (HAND/PEDICURE/BOTH)
  nailType: string;
  status: ReservationStatus;
  // TODO: [malibu] Design 모델 추가 후 연결 예정
  designName: string | null;
}
