// GET /api/v1/reserve/detail - 예약 목록 조회 시 Query Parameter 검증 스키마
import { z } from 'zod';
import { RESERVATION_LIST_STATUSES } from '../reservation.constants';
import { decodeCursor } from '../../common/pagination/cursor';

const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;

// z.coerce.number()를 문자열 체크 없이 바로 쓰면 배열(예: ?size[]=5)도 JS의
// Number([...]) 강제변환 규칙 때문에 숫자로 통과해버린다. z.string()으로 먼저 형태를 걸러낸 뒤 변환한다.
const stringToNumber = z.string().transform((val) => Number(val));

// 커서는 (reservedAt, id) 튜플을 base64url로 인코딩한 값이다.
// reservedAt만으로는 여러 예약이 같은 시각을 가질 수 있어 순서가 불안정하므로
// id를 보조 키로 함께 둔다(피드 정렬과 동일한 이유).
export interface ReservationCursor {
  reservedAt: Date;
  id: bigint;
}

const CursorPayload = z.object({
  reservedAt: z.coerce.date(),
  // JSON은 bigint를 표현할 수 없어 문자열로 실어보낸다.
  id: z.string().regex(/^\d+$/),
});

const cursorSchema = z
  .string()
  .transform((value, ctx): ReservationCursor => {
    const decoded = decodeCursor(value);
    const parsed = CursorPayload.safeParse(decoded);

    if (!parsed.success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '유효하지 않은 cursor입니다.' });
      return z.NEVER;
    }

    return { reservedAt: parsed.data.reservedAt, id: BigInt(parsed.data.id) };
  })
  .optional();

export const GetReservationsRequest = z.object({
  status: z.enum(RESERVATION_LIST_STATUSES),
  cursor: cursorSchema,
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});

export type GetReservationsRequestType = z.infer<typeof GetReservationsRequest>;
