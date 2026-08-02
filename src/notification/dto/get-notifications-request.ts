// GET /api/v1/notifications - 내 알림 목록 조회 시 Query Parameter 검증 스키마
import { z } from 'zod';
import { decodeCursor } from '../../common/pagination/cursor';

const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;

// z.coerce.number()를 바로 쓰면 배열(예: ?size[]=5)도 Number([...]) 강제변환으로 통과하므로,
// z.string()으로 형태를 먼저 걸러낸 뒤 변환한다. (예약 도메인과 동일 패턴)
const stringToNumber = z.string().transform((val) => Number(val));

// 커서는 (createdAt, id) 튜플을 base64url로 인코딩한 값이다.
// createdAt만으로는 같은 시각 알림들의 순서가 불안정하므로 id를 보조 키로 함께 둔다.
export interface NotificationCursor {
  createdAt: Date;
  id: number;
}

const CursorPayload = z.object({
  createdAt: z.coerce.date(),
  id: z.number().int(),
});

const cursorSchema = z
  .string()
  .transform((value, ctx): NotificationCursor => {
    const decoded = decodeCursor(value);
    const parsed = CursorPayload.safeParse(decoded);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효하지 않은 cursor입니다.' });
      return z.NEVER;
    }

    return { createdAt: parsed.data.createdAt, id: parsed.data.id };
  })
  .optional();

export const GetNotificationsRequest = z.object({
  // unread=true면 안읽은 알림만 조회한다. 미지정 시 전체.
  unread: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  cursor: cursorSchema,
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});

export type GetNotificationsRequest = z.infer<typeof GetNotificationsRequest>;
