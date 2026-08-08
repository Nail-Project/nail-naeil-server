// POST /api/v1/reserve/:reservationId/review - 리뷰 작성 성공 시 Response
export interface CreateReviewResponse {
  reviewId: number;
  reservationId: number;
  shopId: number;
  rating: number;
  content: string;
  createdAt: Date;
}
