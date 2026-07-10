// POST /api/v1/estimate - 견적 요청 생성 시 Request Body 검증 스키마
import { z } from 'zod';

export const CreateEstimateRequest = z.object({
  nailType: z.enum(['HAND', 'PEDICURE', 'BOTH']),
  removalType: z.enum(['EXTENSION', 'PARTS', 'BASIC', 'NONE']),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  preferredTime: z.enum(['AM', 'PM', 'EVENING', 'ANY']),
  recommendType: z.enum(['BALANCED', 'CLOSE', 'WIDE', 'CHEAP']),
  description: z.string().optional(),
  images: z.array(z.string()).optional().default([]),
});

export type CreateEstimateRequestType = z.infer<typeof CreateEstimateRequest>;
