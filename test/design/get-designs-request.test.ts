import { describe, expect, it } from 'vitest';
import { GetDesignsRequest } from '../../src/design/dto/get-designs-request';

describe('GetDesignsRequest', () => {
  it('아무 값도 없으면 기본값(1페이지, 10개)을 적용한다', () => {
    const result = GetDesignsRequest.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 1, size: 10 });
  });

  it('문자열 page/size를 숫자로 변환한다', () => {
    const result = GetDesignsRequest.safeParse({ page: '2', size: '20' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 2, size: 20 });
  });

  it('page는 1부터 시작하므로 0은 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ page: '0' }).success).toBe(false);
  });

  it('음수 page는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ page: '-1' }).success).toBe(false);
  });

  it('배열 형태의 page는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ page: ['1', '2'] }).success).toBe(false);
  });

  it('숫자가 아닌 문자열은 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ page: 'abc' }).success).toBe(false);
  });

  it('0 이하의 size는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ size: '0' }).success).toBe(false);
  });

  it('MAX_SIZE(100)를 넘으면 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ size: '101' }).success).toBe(false);
  });
});
