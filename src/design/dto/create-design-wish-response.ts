// POST /api/v1/designs/:designId/wish - 디자인 찜 생성 성공 시 Response
export interface CreateDesignWishResponse {
  isBookmarked: boolean;
  wishCount: number;
}
