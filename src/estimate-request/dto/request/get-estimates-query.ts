// GET /api/v1/estimate/:status - 쿼리 파라미터 검증 스키마
import { z } from 'zod';
import { decodeCursor } from '../../../common/pagination/cursor';

const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

// 문자열을 숫자로 변환 — z.coerce.number()는 배열도 통과시키므로 string으로 먼저 형태를 걸러낸다.
const stringToNumber = z.string().transform((val) => Number(val));

// 커서는 (createdAt, id) 튜플을 base64url로 인코딩한 값이다.
// createdAt이 같은 요청이 있을 수 있으므로 id를 보조 키로 함께 둔다.
export interface EstimateRequestCursor {
  createdAt: Date;
  id: number;
}

const CursorPayload = z.object({
  createdAt: z.coerce.date(),
  id: z.number().int().positive(),
});

const cursorSchema = z
  .string()
  .transform((value, ctx): EstimateRequestCursor => {
    const decoded = decodeCursor(value);
    const parsed = CursorPayload.safeParse(decoded);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효하지 않은 cursor입니다.' });
      return z.NEVER;
    }

    return { createdAt: parsed.data.createdAt, id: parsed.data.id };
  })
  .optional();

export const GetEstimatesQuery = z.object({
  cursor: cursorSchema,
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});

export type GetEstimatesQueryType = z.infer<typeof GetEstimatesQuery>;
