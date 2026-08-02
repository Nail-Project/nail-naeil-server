import { describe, expect, it } from 'vitest';
import { UpdateDesignRequest } from '../../src/design/dto/admin/update-design-request';

describe('UpdateDesignRequest', () => {
  it('빈 객체는 거부한다 (수정할 필드가 최소 1개 필요)', () => {
    expect(UpdateDesignRequest.safeParse({}).success).toBe(false);
  });

  it('필드 하나만 있어도 통과한다', () => {
    const result = UpdateDesignRequest.safeParse({ title: '새 제목' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ title: '새 제목' });
  });

  it('여러 필드를 함께 전달할 수 있다', () => {
    const result = UpdateDesignRequest.safeParse({
      title: '새 제목',
      tags: ['프렌치'],
      images: ['https://.../a.jpg'],
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      title: '새 제목',
      tags: ['프렌치'],
      images: ['https://.../a.jpg'],
    });
  });

  it('필드 값의 타입이 잘못되면 거부한다', () => {
    expect(UpdateDesignRequest.safeParse({ durationMinutes: '60' }).success).toBe(false);
  });
});
