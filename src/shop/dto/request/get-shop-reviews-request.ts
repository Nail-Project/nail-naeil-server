import { z } from 'zod';
import { ShopIdSchema } from './get-shop-detail-request';

export const GetShopReviewsRequestSchema = z.object({
  shopId: ShopIdSchema,
  cursor: z.string().trim().min(1).transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z
    .string()
    .trim()
    .min(1)
    .transform(Number)
    .pipe(z.number().int().min(1).max(50))
    .default(20),
});

export type GetShopReviewsRequest = z.infer<typeof GetShopReviewsRequestSchema>;
