// POST /api/v1/estimate-request - 견적 요청 생성 성공 시 Response
export interface CreateEstimateResponseDto {
  estimateId: number;
  // 자동 생성된 견적 제목. 예: "8/3 패디 견적"
  title: string | null;
  nailType: string;
  removalTypes: string[];
  // 방문 가능 일정 목록 (날짜별 희망 시간대 복수)
  schedules: { date: Date; times: string[] }[];
  recommendType: string;
  description: string | null;
  status: string;
  designId: number | null;
  // 요청에 첨부된 디자인 이미지 목록
  images: { imageId: number; imageUrl: string }[];
  createdAt: Date;
  // 샵에 실제로 발송된 SMS 문자 원문 (클라이언트에서 미리보기 용도)
  smsPreview: string;
}
