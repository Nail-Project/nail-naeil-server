// GET /api/v1/shops/:shopId/reviews - 샵 리뷰 목록 조회 성공 시 Response
export interface PageInfo {
  nextCursor: string | null;
  hasNext: boolean;
}

export interface ShopReviewItem {
  reviewId: number;
  nickname: string | null;
  rating: number;
  content: string;
  createdAt: Date;
}

export interface GetShopReviewsResponse {
  reviews: ShopReviewItem[];
  pageInfo: PageInfo;
}
