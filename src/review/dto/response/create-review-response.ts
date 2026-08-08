// POST /api/v1/reviews - 리뷰 작성 성공 시 Response
export interface CreateReviewResponse {
  reviewId: number;
  shopId: number;
  rating: number;
  content: string | null;
  createdAt: Date;
}
