// GET /api/v1/designs/:designId - 디자인 상세 조회 성공 시 Response
export interface GetDesignDetailResponse {
  designId: number;
  title: string;
  images: string[];
  tags: string[];
  viewCount: number;
  wishCount: number;
  durationMinutes: number;
  difficulty: string;
  recommendedShape: string;
  description: string;
  isBookmarked: boolean;
}
