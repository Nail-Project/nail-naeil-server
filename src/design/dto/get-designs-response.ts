// GET /api/v1/designs - 디자인 피드 조회 성공 시 Response
export interface DesignSummaryItem {
  designId: number;
  title: string;
  imageUrl: string;
  tag: string;
}

export interface PageInfo {
  nextCursor: string | null;
  hasNext: boolean;
}

export interface GetDesignsResponse {
  designs: DesignSummaryItem[];
  pageInfo: PageInfo;
}
