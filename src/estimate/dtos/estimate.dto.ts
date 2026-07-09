import { z } from 'zod';

// ───────────────── 견적 요청 ─────────────────
// 견적 생성 요청 스키마
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

// 견적 생성 응답 DTO
export interface CreateEstimateResponseDto {
  estimateId: number;
  nailType: string;
  removalType: string;
  startDate: Date;
  endDate: Date;
  preferredTime: string;
  recommendType: string;
  description: string | null;
  status: string;
  images: { imageId: number; imageUrl: string }[];
  createdAt: Date;
}

// ─────────────────  ─────────────────
// 상태별 견적 목록 조회 쿼리 스키마
export const GetEstimatesQuery = z.object({
  status: z.enum(['MATCHING', 'COMPLETED', 'EXPIRED', 'ALL']).optional().default('ALL'),
});

export type GetEstimatesQueryType = z.infer<typeof GetEstimatesQuery>;
