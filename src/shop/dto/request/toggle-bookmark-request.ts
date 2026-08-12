import { z } from 'zod';

// POST /api/v1/bookmark/toggle - Request Body 검증 스키마
export const ToggleBookmarkRequestSchema = z.object({
  shopId: z.number().int().positive(),
});

export type ToggleBookmarkRequest = z.infer<typeof ToggleBookmarkRequestSchema>;
