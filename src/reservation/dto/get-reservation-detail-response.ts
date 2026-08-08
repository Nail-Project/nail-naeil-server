import type { ReservationStatus } from '../../generated/prisma/enums';

// GET /api/v1/reserve/:reservationId - 예약 상세 조회 성공 시 Response
export interface GetReservationDetailResponse {
  reservationId: number;
  shopName: string;
  // 예약 변경은 별도 API 없이 프론트에서 이 번호로 안내 팝업을 띄워 처리한다(Figma 기준).
  shopPhoneNumber: string | null;
  // 기존 소비자와의 호환을 위해 address(합친 문자열)는 유지하고, 상세 주소만 따로도 내려준다.
  address: string;
  addressDetail: string | null;
  reservedAt: Date;
  // 견적서 세부내역 - EstimateResponse에 이미 저장돼 있던 값을 그대로 노출한다.
  // Figma의 "디자인 추가"/"옵션 추가" 라벨과 정확히 어떤 필드가 대응하는지는
  // 기획 확인이 필요해서(2026-08-03), 우선 실제 컬럼명 그대로 내려준다.
  basePrice: number | null;
  removalPrice: number | null;
  extraPrice: number | null;
  totalPrice: number;
  // 샵이 견적 응답 시 남긴 코멘트 - EstimateResponse.memo
  shopComment: string | null;
  // 시술 부위 - EstimateRequest.nailType (HAND/PEDICURE/BOTH)
  nailType: string;
  // 제거 유무 - EstimateRequest.removalType
  removalType: string;
  // 견적 요청 시 사용자가 업로드한 원본 참고 이미지 - EstimateRequest.images(RequestImage[])
  images: string[];
  status: ReservationStatus;
  // TODO: [malibu] Design 모델 추가 후 연결 예정
  designName: string | null;
}
