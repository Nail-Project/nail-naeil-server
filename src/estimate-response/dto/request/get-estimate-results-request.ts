import { z } from 'zod';

export const EstimateResultSortSchema = z.enum([
  'RECOMMENDED',
  'LOWEST_PRICE',
  'NEAREST',
  'EARLIEST_AVAILABLE',
]);

export const GetEstimateResultsRequestSchema = z.object({
  sort: EstimateResultSortSchema.optional().default('RECOMMENDED'),
});

export type EstimateResultSort = z.infer<typeof EstimateResultSortSchema>;
export type GetEstimateResultsRequest = z.infer<typeof GetEstimateResultsRequestSchema>;
