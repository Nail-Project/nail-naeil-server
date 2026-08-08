// GET /api/v1/shops/:shopId/reviews - Path Variable/Query Parameter 검증 스키마
import { z } from 'zod';
import { decodeCursor } from '../../../common/pagination/cursor';

const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

export const GetShopReviewsPath = z.object({
  shopId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().int().positive()),
});

// z.coerce.number()를 문자열 체크 없이 바로 쓰면 배열도 JS의 Number([...]) 강제변환
// 규칙 때문에 숫자로 통과해버린다 (get-wishlist-request.ts와 동일 이유).
const stringToNumber = z.string().transform((val) => Number(val));

// 커서는 (createdAt, id) 튜플을 base64url로 인코딩한 값이다 - 리뷰 작성일 기준 최신순 정렬.
export interface ShopReviewCursor {
  createdAt: Date;
  id: number;
}

const CursorPayload = z.object({
  createdAt: z.coerce.date(),
  id: z.number().int().positive(),
});

const cursorSchema = z
  .string()
  .transform((value, ctx): ShopReviewCursor => {
    const decoded = decodeCursor(value);
    const parsed = CursorPayload.safeParse(decoded);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효하지 않은 cursor입니다.' });
      return z.NEVER;
    }

    return parsed.data;
  })
  .optional();

export const GetShopReviewsRequest = z.object({
  cursor: cursorSchema,
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});
