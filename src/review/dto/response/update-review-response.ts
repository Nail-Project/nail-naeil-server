// PATCH /api/v1/reviews/:reviewId - 리뷰 수정 성공 시 Response
export interface UpdateReviewResponse {
  reviewId: number;
  reservationId: number;
  shopId: number;
  rating: number;
  content: string;
  updatedAt: Date;
}
