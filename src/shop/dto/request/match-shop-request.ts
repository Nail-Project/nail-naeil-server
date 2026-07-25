import { z } from 'zod';

export type SupportedRecommendType = 'CLOSE' | 'BALANCED' | 'WIDE';
export type RecommendType = SupportedRecommendType | 'CHEAP';

export const MatchShopRequestSchema = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  recommendType: z.enum(['CLOSE', 'BALANCED', 'WIDE', 'CHEAP']),
});

export type MatchShopRequest = z.infer<typeof MatchShopRequestSchema>;
