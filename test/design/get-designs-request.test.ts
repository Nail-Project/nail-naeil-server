import { describe, expect, it } from 'vitest';
import { GetDesignsRequest } from '../../src/design/dto/get-designs-request';
import { encodeCursor } from '../../src/common/pagination/cursor';

describe('GetDesignsRequest', () => {
  it('아무 값도 없으면 cursor 없이 size 기본값(10)을 적용한다', () => {
    const result = GetDesignsRequest.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ cursor: undefined, size: 10 });
  });

  it('문자열 size를 숫자로 변환한다', () => {
    const result = GetDesignsRequest.safeParse({ size: '20' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ cursor: undefined, size: 20 });
  });

  it('유효한 cursor를 createdAt/id로 디코딩한다', () => {
    const cursor = encodeCursor({ createdAt: '2026-07-27T04:59:00.000Z', id: 5 });

    const result = GetDesignsRequest.safeParse({ cursor });

    expect(result.success).toBe(true);
    expect(result.data?.cursor).toEqual({
      createdAt: new Date('2026-07-27T04:59:00.000Z'),
      id: 5,
    });
  });

  it('base64/JSON 형식 자체가 깨진 cursor는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ cursor: 'not-a-valid-cursor' }).success).toBe(false);
  });

  it('필드가 빠진 cursor payload는 거부한다', () => {
    const cursor = encodeCursor({ createdAt: '2026-07-27T04:59:00.000Z' });

    expect(GetDesignsRequest.safeParse({ cursor }).success).toBe(false);
  });

  it('id가 양의 정수가 아닌 cursor payload는 거부한다', () => {
    const cursor = encodeCursor({ createdAt: '2026-07-27T04:59:00.000Z', id: -1 });

    expect(GetDesignsRequest.safeParse({ cursor }).success).toBe(false);
  });

  it('배열 형태의 size는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ size: ['1', '2'] }).success).toBe(false);
  });

  it('숫자가 아닌 문자열 size는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ size: 'abc' }).success).toBe(false);
  });

  it('0 이하의 size는 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ size: '0' }).success).toBe(false);
  });

  it('MAX_SIZE(100)를 넘으면 거부한다', () => {
    expect(GetDesignsRequest.safeParse({ size: '101' }).success).toBe(false);
  });
});
