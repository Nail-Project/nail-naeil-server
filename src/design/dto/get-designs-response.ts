// GET /api/v1/designs - 디자인 피드 조회 성공 시 Response
export interface DesignSummaryItem {
  designId: number;
  title: string;
  imageUrl: string;
  tags: string[];
  viewCount: number;
  wishCount: number;
  // "상담폭주" 배지 - 최근 일정 기간 견적 요청이 몰린 디자인인지 여부.
  isHot: boolean;
}

export interface PageInfo {
  nextCursor: string | null;
  hasNext: boolean;
}

export interface GetDesignsResponse {
  designs: DesignSummaryItem[];
  pageInfo: PageInfo;
}
