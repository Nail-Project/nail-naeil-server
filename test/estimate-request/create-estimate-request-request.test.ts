import { describe, expect, it } from 'vitest';
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
    it('오늘~7일 이내 날짜면 허용한다', () => {
      expect(CreateEstimateRequestSchema.safeParse(validRequest).success).toBe(true);
    });

    it.each(['2026-02-29', '2026-02-31', '2026-13-01', '2026-04-31'])(
      '존재하지 않는 날짜 %s를 거절한다',
      (date) => {
        const req = { ...validRequest, schedules: [{ date, times: ['AM'] }] };
        expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
      },
    );

    it('오늘로부터 8일 이후 날짜를 거절한다', () => {
      const req = { ...validRequest, schedules: [{ date: getSeoulDate(8), times: ['AM'] }] };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
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

  describe('times 중복 검증', () => {
    it('동일 날짜에 중복 시간대를 거절한다', () => {
      const req = {
        ...validRequest,
        schedules: [{ date: getSeoulDate(1), times: ['AM', 'AM'] }],
      };
      expect(CreateEstimateRequestSchema.safeParse(req).success).toBe(false);
    });
  });

  describe('removalTypes 중복 검증', () => {
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
