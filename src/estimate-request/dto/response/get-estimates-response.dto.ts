// GET /api/v1/estimate/:status - 상태별 견적 목록 조회 성공 시 Response
// 목록 카드에 표시할 최소한의 데이터만 포함한다.
export interface GetEstimatesResponseDto {
  estimateId: number;
  // 요청에 첨부된 디자인 이미지 목록 (등록 순)
  images: { imageId: number; imageUrl: string }[];
  nailType: string;
  // 제거 종류 (복수 선택): NONE | BASIC | PARTS | EXTENSION
  removalTypes: string[];
  // 방문 가능 일정 목록 (날짜별 희망 시간대)
  schedules: { date: Date; times: string[] }[];
  createdAt: Date;
  // 견적 요청 상태: MATCHING | COMPLETED | EXPIRED
  status: string;
  // 이 요청에 도착한 견적 응답(샵 제안) 수
  proposalCount: number;
  // 아직 SUBMITTED(응답 대기) 상태인 샵 수
  submittedShopCount: number;
  // 도착한 견적 중 최저 총금액 (견적 응답이 없으면 null)
  minPrice: number | null;
}

export interface GetEstimatesPageResponse {
  estimates: GetEstimatesResponseDto[];
  pageInfo: {
    nextCursor: string | null;
    hasNext: boolean;
  };
}
