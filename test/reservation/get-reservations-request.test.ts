import { describe, expect, it } from 'vitest';
import { GetReservationsRequest } from '../../src/reservation/dto/get-reservations-request';

describe('GetReservationsRequest', () => {
  it('status만 있으면 page/size 기본값을 적용한다', () => {
    const result = GetReservationsRequest.safeParse({ status: 'CONFIRMED' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 'CONFIRMED', page: 0, size: 10 });
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

  it('문자열 page/size를 숫자로 변환한다', () => {
    const result = GetReservationsRequest.safeParse({
      status: 'CONFIRMED',
      page: '2',
      size: '20',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 'CONFIRMED', page: 2, size: 20 });
  });

  it('배열 형태의 page는 거부한다 (Number([...]) 강제변환 우회 방지)', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', page: ['5'] }).success,
    ).toBe(false);
  });

  it('숫자가 아닌 문자열 page는 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', page: 'abc' }).success,
    ).toBe(false);
  });

  it('음수 page는 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', page: '-1' }).success,
    ).toBe(false);
  });

  it('MAX_PAGE(10000)를 넘으면 거부한다', () => {
    expect(
      GetReservationsRequest.safeParse({ status: 'CONFIRMED', page: '10001' }).success,
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
