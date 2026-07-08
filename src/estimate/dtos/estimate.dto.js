import { z } from 'zod';

export const CreateEstimateRequest = z.object({
  nailType: z.enum(['HAND', 'PEDICURE', 'BOTH']),
  removalType: z.enum(['EXTENSION', 'PARTS', 'BASIC', 'NONE']),
  startDate: z.string(),
  endDate: z.string(),
  preferredTime: z.enum(['AM', 'PM', 'EVENING', 'ANY']),
  recommendType: z.enum(['BALANCED', 'CLOSE', 'WIDE', 'CHEAP']),
  description: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
});
