// GET /api/v1/designs - 디자인 피드 조회 시 Query Parameter 검증 스키마
import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 10;
const MAX_SIZE = 100;
// offset 기반 페이지네이션에서 과도하게 큰 offset으로 풀스캔이 유발되지 않도록 상한을 둔다.
const MAX_PAGE = 10000;

// z.coerce.number()를 문자열 체크 없이 바로 쓰면 배열도 JS의 Number([...]) 강제변환
// 규칙 때문에 숫자로 통과해버린다 (예약 도메인에서 발견된 문제). z.string()으로 먼저
// 형태를 걸러낸 뒤 변환한다.
const stringToNumber = z.string().transform((val) => Number(val));

// currentPage는 1부터 시작 (API 스펙의 pageInfo.currentPage 규칙과 동일하게 맞춤)
export const GetDesignsRequest = z.object({
  page: stringToNumber.pipe(z.number().int().min(1).max(MAX_PAGE)).default(DEFAULT_PAGE),
  size: stringToNumber.pipe(z.number().int().positive().max(MAX_SIZE)).default(DEFAULT_SIZE),
});

export type GetDesignsRequestType = z.infer<typeof GetDesignsRequest>;
