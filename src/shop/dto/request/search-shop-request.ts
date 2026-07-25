import { z } from 'zod';
import { GetShopListRequestSchema } from './get-shop-list-request';

export const SearchShopRequestSchema = GetShopListRequestSchema.extend({
  keyword: z.string().trim().min(1).max(100),
});

export type SearchShopRequest = z.infer<typeof SearchShopRequestSchema>;
