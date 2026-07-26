import { describe, expect, it } from 'vitest';
import { CreateReservationRequest } from '../../src/reservation/dto/create-reservation-request';

describe('CreateReservationRequest', () => {
  it('proposalId와 timeId를 검증한다', () => {
    const result = CreateReservationRequest.safeParse({ proposalId: 5, timeId: 12 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ proposalId: 5, timeId: 12 });
  });

  it('proposalId가 없으면 거부한다', () => {
    expect(CreateReservationRequest.safeParse({ timeId: 12 }).success).toBe(false);
  });

  it('timeId가 없으면 거부한다', () => {
    expect(CreateReservationRequest.safeParse({ proposalId: 5 }).success).toBe(false);
  });

  it.each([0, -1, -100])('0 이하의 proposalId(%i)는 거부한다', (proposalId) => {
    expect(CreateReservationRequest.safeParse({ proposalId, timeId: 12 }).success).toBe(false);
  });

  it('정수가 아닌 proposalId는 거부한다', () => {
    expect(CreateReservationRequest.safeParse({ proposalId: 5.5, timeId: 12 }).success).toBe(
      false,
    );
  });

  it('MySQL INT 상한(2147483647)을 넘는 값은 거부한다', () => {
    expect(
      CreateReservationRequest.safeParse({ proposalId: 2147483648, timeId: 12 }).success,
    ).toBe(false);
  });

  it('MySQL INT 상한값 자체는 허용한다', () => {
    expect(
      CreateReservationRequest.safeParse({ proposalId: 2147483647, timeId: 12 }).success,
    ).toBe(true);
  });

  it('문자열로 들어온 숫자는 거부한다 (암묵적 형변환 없음)', () => {
    expect(CreateReservationRequest.safeParse({ proposalId: '5', timeId: 12 }).success).toBe(
      false,
    );
  });
});
