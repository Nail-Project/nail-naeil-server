// PATCH·DELETE /api/v1/reviews/:reviewId - Path Variable 검증 스키마
import { z } from 'zod';

export const ReviewIdPath = z.object({
  reviewId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive()),
});

export type ReviewIdPathType = z.infer<typeof ReviewIdPath>;
