import type { ReservationStatus } from '../../generated/prisma/enums';
import type { JsonValue } from '../../common/types/json';

// GET /api/v1/reserve/:reservationId - 예약 상세 조회 성공 시 Response
export interface GetReservationDetailResponse {
  reservationId: number;
  // 샵 리뷰 목록(GET /api/v1/shops/{shopId}/reviews) 등 다른 API를 이어서 호출할 때 필요하다.
  shopId: number;
  shopName: string;
  // 예약 변경은 별도 API 없이 프론트에서 이 번호로 안내 팝업을 띄워 처리한다(Figma 기준).
  shopPhoneNumber: string | null;
  // 리뷰가 하나도 없으면 0. Review 생성 시 재계산되는 Shop.rating/reviewCount를 그대로 노출한다.
  shopRating: number;
  shopReviewCount: number;
  // 기존 소비자와의 호환을 위해 address(합친 문자열)는 유지하고, 상세 주소만 따로도 내려준다.
  address: string;
  addressDetail: string | null;
  // 지도 표시/길찾기 연동용 샵 좌표.
  latitude: number;
  longitude: number;
  shopThumbnailUrl: string | null;
  shopBusinessHours: JsonValue | null;
  shopClosedDays: JsonValue | null;
  // "예약 당시 위치"가 아니라 "지금 사용자 위치" 기준 거리라, 상세 조회 API의 latitude/longitude
  // 쿼리 파라미터로 받는다(2026-08-09). 둘 다 전달되지 않으면 null.
  distanceMeters: number | null;
  reservedAt: Date;
  // 견적서 세부내역 - EstimateResponse에 이미 저장돼 있던 값을 그대로 노출한다.
  // Figma 가격 세부내역 화면(기본 가격/디자인 추가/옵션 추가/쿠폰 할인/최종 예상 금액) 기준으로
  // 확정된 매핑(2026-08-09): basePrice=기본 가격, designExtraPrice=디자인 추가,
  // optionExtraPrice=옵션 추가, totalPrice=최종 예상 금액.
  basePrice: number | null;
  removalPrice: number | null;
  designExtraPrice: number | null;
  optionExtraPrice: number | null;
  // 쿠폰 도메인이 아직 없어 항상 0을 반환하는 더미 필드. 쿠폰 기능이 생기면 실제 값으로 교체 예정.
  couponDiscount: number;
  totalPrice: number | null;
  // 샵이 견적 응답 시 남긴 코멘트 - EstimateResponse.memo
  shopComment: string | null;
  // 시술 부위 - EstimateRequest.nailType (HAND/PEDICURE/BOTH)
  nailType: string;
  // 제거 종류 목록 - EstimateRequestRemoval 조인 테이블 (복수 선택)
  removalTypes: string[];
  // 견적 요청 시 사용자가 업로드한 원본 참고 이미지 - EstimateRequest.images(RequestImage[])
  images: string[];
  status: ReservationStatus;
  // 카탈로그 디자인 그대로 견적받은 예약만 값이 있다. 사용자가 직접 사진을 올려
  // 요청한 예약은 연결된 디자인이 없어 null.
  designName: string | null;
}
