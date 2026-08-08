import { describe, expect, it } from 'vitest';
import { CreateEstimateRequestSchema } from '../../src/estimate-request/dto/request/create-estimate-request.dto';

const validRequest = {
  nailType: 'HAND',
  removalType: 'NONE',
  startDate: '2028-02-29',
  endDate: '2028-03-01',
  preferredTime: 'ANY',
  recommendType: 'BALANCED',
  shopIds: [1],
} as const;

describe('CreateEstimateRequestSchema 날짜 검증', () => {
  it('윤년의 2월 29일은 허용한다', () => {
    expect(CreateEstimateRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it.each(['2026-02-29', '2026-02-31', '2026-13-01', '2026-04-31'])(
    '존재하지 않는 날짜 %s를 거절한다',
    (startDate) => {
      expect(CreateEstimateRequestSchema.safeParse({ ...validRequest, startDate }).success).toBe(
        false,
      );
    },
  );
});
