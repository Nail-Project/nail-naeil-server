import { describe, expect, it } from 'vitest';
import { GetReservationDetailRequest } from '../../src/reservation/dto/get-reservation-detail-request';

describe('GetReservationDetailRequest', () => {
  it('숫자 문자열 reservationId를 숫자로 변환한다', () => {
    const result = GetReservationDetailRequest.safeParse({ reservationId: '5' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ reservationId: 5 });
  });

  it('숫자가 아닌 문자열은 거부한다', () => {
    expect(GetReservationDetailRequest.safeParse({ reservationId: 'abc' }).success).toBe(false);
  });

  it('0은 거부한다', () => {
    expect(GetReservationDetailRequest.safeParse({ reservationId: '0' }).success).toBe(false);
  });

  it('음수는 거부한다', () => {
    expect(GetReservationDetailRequest.safeParse({ reservationId: '-1' }).success).toBe(false);
  });

  it('정수가 아닌 값(소수)은 거부한다', () => {
    expect(GetReservationDetailRequest.safeParse({ reservationId: '1.5' }).success).toBe(false);
  });

  it('JS Number의 안전한 정수 범위를 넘으면 거부한다', () => {
    expect(
      GetReservationDetailRequest.safeParse({ reservationId: '99999999999999999999' }).success,
    ).toBe(false);
  });

  it('배열 입력은 거부한다', () => {
    expect(GetReservationDetailRequest.safeParse({ reservationId: ['5'] }).success).toBe(false);
  });

  it('reservationId가 없으면 거부한다', () => {
    expect(GetReservationDetailRequest.safeParse({}).success).toBe(false);
  });
});
