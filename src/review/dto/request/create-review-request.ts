// POST /api/v1/reserve/:reservationId/review - Request Body 검증 스키마
import { z } from 'zod';

export const CreateReviewRequest = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().trim().min(1).max(1000),
});

export type CreateReviewRequestType = z.infer<typeof CreateReviewRequest>;
