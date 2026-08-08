import { describe, expect, it } from 'vitest';
import { GetReservationsRequest } from '../../src/reservation/dto/get-reservations-request';
import { encodeCursor } from '../../src/common/pagination/cursor';

describe('GetReservationsRequest', () => {
  it('status만 있으면 cursor 없이 size 기본값을 적용한다', () => {
    const result = GetReservationsRequest.safeParse({ status: 'CONFIRMED' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 'CONFIRMED', cursor: undefined, size: 10 });
  });

  it('PAST 상태도 허용한다', () => {
    expect(GetReservationsRequest.safeParse({ status: 'PAST' }).success).toBe(true);
  });

  it('정의되지 않은 상태값은 거부한다', () => {
    expect(GetReservationsRequest.safeParse({ status: 'COMPLETED' }).success).toBe(false);
  });

  it('status가 없으면 거부한다 (필수값)', () => {
    expect(GetReservationsRequest.safeParse({}).success).toBe(false);
  });

  it('유효한 cursor를 reservedAt/id로 디코딩한다', () => {
    const cursor = encodeCursor({ reservedAt: '2026-05-10T16:00:00.000Z', id: '7' });

    const result = GetReservationsRequest.safeParse({ status: 'CONFIRMED', cursor });

    expect(result.success).toBe(true);
    expect(result.data?.cursor).toEqual({
      reservedAt: new Date('2026-05-10T16:00:00.000Z'),
      id: 7n,
    });
  });

  it('base64/JSON 형식 자체가 깨진 cursor는 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', cursor: 'not-a-valid-cursor' })
        .success,
    ).toBe(false);
  });

  it('필드가 빠진 cursor payload는 거부한다', () => {
    const cursor = encodeCursor({ reservedAt: '2026-05-10T16:00:00.000Z' });

    expect(GetReservationsRequest.safeParse({ status: 'CONFIRMED', cursor }).success).toBe(false);
  });

  it('id가 숫자 문자열이 아닌 cursor payload는 거부한다', () => {
    const cursor = encodeCursor({ reservedAt: '2026-05-10T16:00:00.000Z', id: 'abc' });

    expect(GetReservationsRequest.safeParse({ status: 'CONFIRMED', cursor }).success).toBe(false);
  });

  it('문자열 size를 숫자로 변환한다', () => {
    const result = GetReservationsRequest.safeParse({ status: 'CONFIRMED', size: '20' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 'CONFIRMED', cursor: undefined, size: 20 });
  });

  it('배열 형태의 size는 거부한다 (Number([...]) 강제변환 우회 방지)', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', size: ['20'] }).success,
    ).toBe(false);
  });

  it('숫자가 아닌 문자열 size는 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', size: 'abc' }).success,
    ).toBe(false);
  });

  it('0 이하의 size는 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', size: '0' }).success,
    ).toBe(false);
  });

  it('MAX_SIZE(100)를 넘으면 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', size: '101' }).success,
    ).toBe(false);
  });
});
