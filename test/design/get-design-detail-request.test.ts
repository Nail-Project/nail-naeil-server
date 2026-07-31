import { describe, expect, it } from 'vitest';
import { GetDesignDetailRequest } from '../../src/design/dto/get-design-detail-request';

describe('GetDesignDetailRequest', () => {
  it('숫자 문자열 designId를 숫자로 변환한다', () => {
    const result = GetDesignDetailRequest.safeParse({ designId: '1' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ designId: 1 });
  });

  it('숫자가 아닌 문자열은 거부한다', () => {
    expect(GetDesignDetailRequest.safeParse({ designId: 'abc' }).success).toBe(false);
  });

  it('0은 거부한다', () => {
    expect(GetDesignDetailRequest.safeParse({ designId: '0' }).success).toBe(false);
  });

  it('음수는 거부한다', () => {
    expect(GetDesignDetailRequest.safeParse({ designId: '-1' }).success).toBe(false);
  });

  it('배열 입력은 거부한다', () => {
    expect(GetDesignDetailRequest.safeParse({ designId: ['1'] }).success).toBe(false);
  });
});
