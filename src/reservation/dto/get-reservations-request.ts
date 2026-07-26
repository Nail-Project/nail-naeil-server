// GET /api/v1/reserve/detail - 예약 목록 조회 시 Query Parameter 검증 스키마
import { z } from 'zod';
import { RESERVATION_LIST_STATUSES } from '../reservation.constants';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;
// offset 기반 페이지네이션에서 과도하게 큰 offset으로 풀스캔이 유발되지 않도록 상한을 둔다.
// 사용자별 예약 건수 기준으로는 현실적으로 도달하지 않는 넉넉한 값이다.
const MAX_PAGE = 10000;

// z.coerce.number()를 문자열 체크 없이 바로 쓰면 배열(예: ?page[]=5)도 JS의
// Number([...]) 강제변환 규칙 때문에 숫자로 통과해버린다. z.string()으로 먼저 형태를 걸러낸 뒤 변환한다.
const stringToNumber = z.string().transform((val) => Number(val));

export const GetReservationsRequest = z.object({
  status: z.enum(RESERVATION_LIST_STATUSES),
  page: stringToNumber.pipe(z.number().int().min(0).max(MAX_PAGE)).default(DEFAULT_PAGE),
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});
