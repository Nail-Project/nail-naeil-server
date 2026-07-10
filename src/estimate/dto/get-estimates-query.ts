import { z } from 'zod';

export const GetEstimatesQuery = z.object({
  status: z.enum(['MATCHING', 'COMPLETED', 'EXPIRED', 'ALL']).optional().default('ALL'),
});

export type GetEstimatesQueryType = z.infer<typeof GetEstimatesQuery>;
