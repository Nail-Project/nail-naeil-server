// GET /api/v1/designs/:designId - 디자인 상세 조회 시 Path Variable 검증 스키마
import { z } from 'zod';

export const GetDesignDetailRequest = z.object({
  designId: z.string().transform(Number).pipe(z.number().int().positive().safe()),
});
