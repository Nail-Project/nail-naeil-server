// POST /api/v1/reviews - Request Body 검증 스키마
import { z } from 'zod';

export const CreateReviewRequest = z.object({
  shopId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  // ShopReview.content가 nullable이라 별점만 남기는 리뷰도 허용한다.
  content: z.string().trim().min(1).max(1000).optional(),
});

export type CreateReviewRequestType = z.infer<typeof CreateReviewRequest>;
