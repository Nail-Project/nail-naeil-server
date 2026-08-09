// POST /api/v1/estimate-request - 견적 요청 생성 시 Request Body 검증 스키마
// zod로 런타임 검증 후 타입을 추론해 controller → service → repository에서 그대로 사용한다.
import { z } from 'zod';

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.')
  .refine((value) => {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, '유효한 날짜를 입력해야 합니다.');

// 날짜별 희망 시간 항목 스키마
const scheduleItemSchema = z.object({
  // 방문 희망 날짜 (YYYY-MM-DD)
  date: calendarDateSchema,
  // 해당 날짜의 희망 시간대 (복수 선택 가능): 오전(AM), 오후(PM), 저녁(EVENING), 상관없음(ANY)
  // 중복 불가 — 복합 PK (requestId, date, time) 위반 방지
  times: z
    .array(z.enum(['AM', 'PM', 'EVENING', 'ANY']))
    .min(1, '시간대를 최소 1개 이상 선택해야 합니다.')
    .max(4, '시간대는 최대 4개까지 선택할 수 있습니다.')
    .refine((arr) => new Set(arr).size === arr.length, '시간대에 중복 값이 있습니다.'),
});

export const CreateEstimateRequestSchema = z
  .object({
    // 네일 종류: 손(HAND), 발(PEDICURE), 손+발(BOTH)
    nailType: z.enum(['HAND', 'PEDICURE', 'BOTH']),

    // 제거 종류 (복수 선택 가능): 제거 없음(NONE), 젤 제거(BASIC), 아트/파츠 제거(PARTS), 연장 제거(EXTENSION)
    // 최소 1개 이상 선택 필수, 최대 4개 (전체 선택), 중복 불가
    removalTypes: z
      .array(z.enum(['EXTENSION', 'PARTS', 'BASIC', 'NONE']))
      .min(1, '제거 종류를 최소 1개 이상 선택해야 합니다.')
      .max(4, '제거 종류는 최대 4개까지 선택할 수 있습니다.')
      .refine((arr) => new Set(arr).size === arr.length, '제거 종류에 중복 값이 있습니다.'),

    // 방문 가능 일정 목록 - 날짜별 희망 시간을 함께 전달한다.
    // 최소 1일 이상 선택 필수, 최대 7일 (오늘~오늘+7일 범위 내)
    // 같은 날짜 중복 선택 불가
    schedules: z
      .array(scheduleItemSchema)
      .min(1, '방문 가능 일정을 최소 1일 이상 선택해야 합니다.')
      .max(7, '방문 가능 일정은 최대 7일까지 선택할 수 있습니다.'),

    // 샵 추천 기준: 균형(BALANCED), 가까운 순(CLOSE), 넓은 범위(WIDE), 저렴한 순(CHEAP)
    recommendType: z.enum(['BALANCED', 'CLOSE', 'WIDE', 'CHEAP']),

    // 추가 요청 사항 (선택)
    description: z.string().optional(),

    // 카탈로그 디자인 연결 ID (선택) — "이 디자인 그대로 견적받기" 흐름에서만 전달됨
    designId: z.number().int().positive().optional(),

    // 예상 가격 범위 (선택) - DB 미저장, SMS 발송 시 참고용으로만 사용
    // 슬라이더에서 설정한 최소·최대 금액 (단위: 원)
    priceMin: z.number().int().nonnegative().optional(),
    priceMax: z.number().int().positive().optional(),

    // 디자인 이미지 URL 목록 - image 도메인에서 미리 업로드 후 URL을 받아 전달한다.
    // 최소 1장 필수, 최대 3장까지 허용 (SMS 발송은 첫 번째 이미지 1장만 전송)
    // S3 URL 형식만 허용: https://{bucket}.s3.{region}.amazonaws.com/images/YYYY-MM-DD/{uuid}.{ext}
    // 서비스의 isAllowedS3ImageUrl() 검증 정책과 일치시킨다.
    images: z
      .array(
        z
          .string()
          .regex(
            /^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/images\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-zA-Z]+$/,
            '올바른 S3 이미지 URL이 아닙니다.',
          ),
      )
      .min(1, '디자인 이미지를 최소 1장 첨부해야 합니다.')
      .max(3, '이미지는 최대 3장까지 첨부할 수 있습니다.'),

    // 견적을 보낼 샵 ID 목록 - 주변 샵 조회 API에서 받은 shopId 목록을 전달한다.
    // 빈 배열이면 NO_SHOPS_SELECTED(400) 에러를 반환한다.
    // 최대 20개로 제한 - 대량 문자 발송 비용 남용 방지 (추후 샵 탐색 API 설계 시 재검토)
    shopIds: z
      .array(z.number().int().positive())
      .min(1, '견적 요청할 샵이 없습니다.')
      .max(20, '한 번에 요청할 수 있는 샵 수를 초과했습니다.'),
  })
  .refine((data) => {
    // 각 날짜가 오늘 이후인지 검증
    const today = new Date().toISOString().split('T')[0];
    return data.schedules.every((s) => s.date >= today);
  }, {
    message: '방문 가능 일정은 오늘 이후 날짜여야 합니다.',
    path: ['schedules'],
  })
  .refine((data) => {
    // 각 날짜가 오늘로부터 7일 이내인지 검증
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    return data.schedules.every((s) => s.date <= maxDateStr);
  }, {
    message: '방문 가능 일정은 오늘부터 7일 이내여야 합니다.',
    path: ['schedules'],
  })
  .refine((data) => {
    // 중복 날짜 검증
    const dates = data.schedules.map((s) => s.date);
    return dates.length === new Set(dates).size;
  }, {
    message: '날짜가 중복되었습니다.',
    path: ['schedules'],
  })
  .refine((data) => {
    // 둘 다 있을 때만 비교 (각각 선택값이므로 한쪽만 있는 경우는 통과)
    if (data.priceMin !== undefined && data.priceMax !== undefined) {
      return data.priceMax >= data.priceMin;
    }
    return true;
  }, {
    message: '최대 가격은 최소 가격 이상이어야 합니다.',
    path: ['priceMax'],
  });

export type CreateEstimateRequestDto = z.infer<typeof CreateEstimateRequestSchema>;
