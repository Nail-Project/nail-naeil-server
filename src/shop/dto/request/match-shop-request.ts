import { z } from 'zod';

export type SupportedRecommendType = 'CLOSE' | 'BALANCED' | 'WIDE' | 'CHEAP';
export type RecommendType = SupportedRecommendType | 'CHEAP';

const CoordinateQuerySchema = z.string().trim().min(1).pipe(z.coerce.number());

export const MatchShopRequestSchema = z.object({
  latitude: CoordinateQuerySchema,
  longitude: CoordinateQuerySchema,
  recommendType: z.enum(['CLOSE', 'BALANCED', 'WIDE', 'CHEAP']),
});

export type MatchShopRequest = z.infer<typeof MatchShopRequestSchema>;
