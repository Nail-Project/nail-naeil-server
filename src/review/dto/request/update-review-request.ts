// PATCH /api/v1/reviews/:reviewId - Request Body 검증 스키마
import { z } from 'zod';

export const UpdateReviewRequest = z
  .object({
    rating: z.number().int().min(1).max(5),
    content: z.string().trim().min(1).max(1000),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: '수정할 필드를 하나 이상 전달해야 합니다.',
  });

export type UpdateReviewRequestType = z.infer<typeof UpdateReviewRequest>;
