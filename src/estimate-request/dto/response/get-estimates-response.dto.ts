// GET /api/v1/estimate-request?status= - 상태별 견적 목록 조회 성공 시 Response
// 목록 카드에 표시할 최소한의 데이터만 포함한다.
export interface GetEstimatesResponseDto {
  estimateId: number;
  // 요청에 첨부된 첫 번째 이미지 URL (없으면 null)
  thumbnailUrl: string | null;
  nailType: string;
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
