// GET /api/notifications - 내 알림 목록 조회 시 Query Parameter 검증 스키마
import { z } from 'zod';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;
// offset 기반 페이지네이션에서 과도하게 큰 offset으로 풀스캔이 유발되지 않도록 상한을 둔다.
const MAX_PAGE = 10000;

// z.coerce.number()를 바로 쓰면 배열(예: ?page[]=5)도 Number([...]) 강제변환으로 통과하므로,
// z.string()으로 형태를 먼저 걸러낸 뒤 변환한다. (예약 도메인과 동일 패턴)
const stringToNumber = z.string().transform((val) => Number(val));

export const GetNotificationsRequest = z.object({
  // unread=true면 안읽은 알림만 조회한다. 미지정 시 전체.
  unread: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  page: stringToNumber.pipe(z.number().int().min(0).max(MAX_PAGE)).default(DEFAULT_PAGE),
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});

export type GetNotificationsRequest = z.infer<typeof GetNotificationsRequest>;
