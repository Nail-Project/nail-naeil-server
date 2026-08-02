// GET /api/v1/designs - 디자인 피드 조회 시 Query Parameter 검증 스키마
import { z } from 'zod';
import { decodeCursor } from '../../common/pagination/cursor';

const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

// z.coerce.number()를 문자열 체크 없이 바로 쓰면 배열도 JS의 Number([...]) 강제변환
// 규칙 때문에 숫자로 통과해버린다 (예약 도메인에서 발견된 문제). z.string()으로 먼저
// 형태를 걸러낸 뒤 변환한다.
const stringToNumber = z.string().transform((val) => Number(val));

// 커서는 (createdAt, id) 튜플을 base64url로 인코딩한 값이다.
// createdAt만으로는 같은 시각에 생성된 디자인들의 순서가 보장되지 않아 id를 보조 키로 둔다.
export interface DesignCursor {
  createdAt: Date;
  id: number;
}

const CursorPayload = z.object({
  createdAt: z.coerce.date(),
  id: z.number().int().positive(),
});

const cursorSchema = z
  .string()
  .transform((value, ctx): DesignCursor => {
    const decoded = decodeCursor(value);
    const parsed = CursorPayload.safeParse(decoded);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효하지 않은 cursor입니다.' });
      return z.NEVER;
    }

    return parsed.data;
  })
  .optional();

export const GetDesignsRequest = z.object({
  cursor: cursorSchema,
  // 태그 이름으로 필터링한다("카테고리 탭") - 고정된 목록을 여기서 강제하지 않는다.
  // 태그는 AI 자동 태깅으로 계속 늘어나므로, 어떤 이름이 오든 그 태그가 달린 디자인만
  // 걸러줄 뿐이다. 매칭되는 디자인이 없으면 에러가 아니라 빈 배열을 반환한다.
  category: z.string().trim().min(1).max(50).optional(),
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});
