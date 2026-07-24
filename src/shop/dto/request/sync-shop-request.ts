import { z } from 'zod';

export const syncShopRequestSchema = z.object({
  industryCode: z.string().trim().min(1).max(20),
  pageSize: z.number().int().min(1).max(1000).default(1000),
  maxPages: z.number().int().min(1).max(100).default(100),
});

export type SyncShopRequest = z.infer<typeof syncShopRequestSchema>;
