import { describe, expect, it } from 'vitest';
import { GetNotificationsRequest } from '../../src/notification/dto/get-notifications-request';
import { encodeCursor } from '../../src/common/pagination/cursor';

describe('GetNotificationsRequest', () => {
  it('쿼리가 없으면 size 기본값을 적용하고 cursor는 없다', () => {
    const result = GetNotificationsRequest.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ size: 20 });
  });

  it('문자열 size를 숫자로 변환한다', () => {
    const result = GetNotificationsRequest.safeParse({ size: '10' });

    expect(result.success).toBe(true);
    expect(result.data?.size).toBe(10);
  });

  it('유효한 cursor를 (createdAt, id)로 디코딩한다', () => {
    const cursor = encodeCursor({ createdAt: '2026-07-31T00:00:00.000Z', id: 5 });

    const result = GetNotificationsRequest.safeParse({ cursor });

    expect(result.success).toBe(true);
    expect(result.data?.cursor).toEqual({
      createdAt: new Date('2026-07-31T00:00:00.000Z'),
      id: 5,
    });
  });

  it('형식이 깨진 cursor는 거부한다', () => {
    expect(GetNotificationsRequest.safeParse({ cursor: 'not-a-valid-cursor' }).success).toBe(false);
  });

  it("unread='true'는 boolean true로 변환한다", () => {
    const result = GetNotificationsRequest.safeParse({ unread: 'true' });

    expect(result.success).toBe(true);
    expect(result.data?.unread).toBe(true);
  });

  it('size 상한(100)을 초과하면 거부한다', () => {
    expect(GetNotificationsRequest.safeParse({ size: '101' }).success).toBe(false);
  });

  it('배열 형태의 size는 거부한다 (Number([...]) 강제변환 우회 방지)', () => {
    expect(GetNotificationsRequest.safeParse({ size: ['5'] }).success).toBe(false);
  });

  it("unread에 'true'/'false' 외 값은 거부한다", () => {
    expect(GetNotificationsRequest.safeParse({ unread: 'yes' }).success).toBe(false);
  });
});
