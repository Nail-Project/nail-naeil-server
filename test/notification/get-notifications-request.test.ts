import { describe, expect, it } from 'vitest';
import { GetNotificationsRequest } from '../../src/notification/dto/get-notifications-request';

describe('GetNotificationsRequest', () => {
  it('쿼리가 없으면 page/size 기본값을 적용한다', () => {
    const result = GetNotificationsRequest.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 0, size: 20 });
  });

  it('문자열 page/size를 숫자로 변환한다', () => {
    const result = GetNotificationsRequest.safeParse({ page: '2', size: '10' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 2, size: 10 });
  });

  it("unread='true'는 boolean true로 변환한다", () => {
    const result = GetNotificationsRequest.safeParse({ unread: 'true' });

    expect(result.success).toBe(true);
    expect(result.data?.unread).toBe(true);
  });

  it('size 상한(100)을 초과하면 거부한다', () => {
    expect(GetNotificationsRequest.safeParse({ size: '101' }).success).toBe(false);
  });

  it('배열 형태의 page는 거부한다 (Number([...]) 강제변환 우회 방지)', () => {
    expect(GetNotificationsRequest.safeParse({ page: ['5'] }).success).toBe(false);
  });

  it("unread에 'true'/'false' 외 값은 거부한다", () => {
    expect(GetNotificationsRequest.safeParse({ unread: 'yes' }).success).toBe(false);
  });
});
