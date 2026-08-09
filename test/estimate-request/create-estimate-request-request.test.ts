import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEstimateRequestSchema } from '../../src/estimate-request/dto/request/create-estimate-request.dto';

// 서울(Asia/Seoul) 기준 오늘 날짜 + offsetDays를 YYYY-MM-DD로 반환
// UTC 타임스탬프에 정확히 offsetDays × 86400초를 더해 환경 시간대 영향을 받지 않도록 한다.
function getSeoulDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

const VALID_IMAGE =
  'https://test-bucket.s3.ap-northeast-2.amazonaws.com/images/2026-08-10/00000000-0000-0000-0000-000000000001.jpg';

const validRequest = {
  nailType: 'HAND',
  removalTypes: ['NONE'],
  schedules: [{ date: getSeoulDate(1), times: ['AM'] }],
  recommendType: 'BALANCED',
  images: [VALID_IMAGE],
  shopIds: [1],
};

describe('CreateEstimateRequestSchema', () => {
  describe('schedules 날짜 검증', () => {
    it('오늘(당일)을 허용한다', () => {
      const req = { ...validRequest, schedules: [{ date: getSeoulDate(0), times: ['AM'] }] };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });

    it('오늘~7일 이내 날짜면 허용한다', () => {
      expect(CreateEstimateRequestSchema.safeParse(validRequest).success).toBe(true);
    });

    it('오늘+7일(최대 경계)을 허용한다', () => {
      const req = { ...validRequest, schedules: [{ date: getSeoulDate(7), times: ['AM'] }] };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });

    it('오늘로부터 8일 이후 날짜를 거절한다', () => {
      const req = { ...validRequest, schedules: [{ date: getSeoulDate(8), times: ['AM'] }] };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
    });

    // calendarDateSchema(필드 검증)는 외부 범위 refine보다 먼저 실행된다.
    // 시스템 시각을 2026-02-22(서울) 로 고정해, 아래 날짜들이 7일 창 안에 있으면서도
    // 달력 유효성 검사 때문에 거절되는지 명시적으로 확인한다.
    describe('달력에 없는 날짜 거절', () => {
      beforeEach(() => {
        // UTC 2026-02-22T00:00:00Z = Seoul 2026-02-22T09:00:00+09:00
        // 유효 창: 2026-02-22 ~ 2026-03-01 (Seoul 기준)
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-22T00:00:00.000Z'));
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it.each([
        ['2026-02-29', '2026년은 윤년이 아님 — 창 안에 있지만 날짜 없음'],
        ['2026-02-31', '2월은 최대 29일 — 창 안에 있지만 날짜 없음'],
        ['2026-13-01', '13월은 없음'],
        ['2026-04-31', '4월은 30일까지'],
      ])('%s 을(를) 거절한다 (%s)', (date) => {
        const req = { ...validRequest, schedules: [{ date, times: ['AM'] }] };
        expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
      });
    });

    it('중복 날짜를 거절한다', () => {
      const date = getSeoulDate(1);
      const req = {
        ...validRequest,
        schedules: [
          { date, times: ['AM'] },
          { date, times: ['PM'] },
        ],
      };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
    });
  });

  describe('복수 schedules 허용', () => {
    it('서로 다른 날짜 여러 개와 시간대 여러 개를 허용한다', () => {
      const req = {
        ...validRequest,
        schedules: [
          { date: getSeoulDate(1), times: ['AM', 'PM'] },
          { date: getSeoulDate(2), times: ['PM', 'ANY'] },
        ],
      };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });
  });

  describe('times 중복 검증', () => {
    it('동일 날짜에 서로 다른 복수 시간대를 허용한다', () => {
      const req = {
        ...validRequest,
        schedules: [{ date: getSeoulDate(1), times: ['AM', 'PM', 'ANY'] }],
      };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });

    it('동일 날짜에 중복 시간대를 거절한다', () => {
      const req = {
        ...validRequest,
        schedules: [{ date: getSeoulDate(1), times: ['AM', 'AM'] }],
      };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
    });
  });

  describe('removalTypes 중복 검증', () => {
    it('서로 다른 복수 제거 종류를 허용한다', () => {
      const req = { ...validRequest, removalTypes: ['BASIC', 'PARTS', 'EXTENSION'] };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });

    it('중복 제거 종류를 거절한다', () => {
      const req = { ...validRequest, removalTypes: ['BASIC', 'BASIC'] };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
    });
  });

  describe('priceMin/priceMax 검증', () => {
    it('priceMax가 priceMin보다 작으면 거절한다', () => {
      const req = { ...validRequest, priceMin: 100_000, priceMax: 50_000 };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
    });

    it('priceMin만 있어도 허용한다', () => {
      const req = { ...validRequest, priceMin: 50_000 };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });

    it('priceMax만 있어도 허용한다', () => {
      const req = { ...validRequest, priceMax: 100_000 };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });

    it('priceMin과 priceMax가 같으면 허용한다', () => {
      const req = { ...validRequest, priceMin: 50_000, priceMax: 50_000 };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(true);
    });
  });
});
