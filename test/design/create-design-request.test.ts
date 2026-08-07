import { describe, expect, it } from 'vitest';
import { CreateDesignRequest } from '../../src/design/dto/admin/create-design-request';

const validPayload = {
  title: '글리터 프렌치',
  imageUrl: 'https://.../design1.jpg',
  durationMinutes: 60,
  difficulty: '보통',
  recommendedShape: '라운드',
  description: '설명',
};

describe('CreateDesignRequest', () => {
  it('필수 필드만 있으면 통과하고 images/tags는 빈 배열이 기본값이다', () => {
    const result = CreateDesignRequest.safeParse(validPayload);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ ...validPayload, images: [], tags: [] });
  });

  it('images/tags를 전달하면 그대로 반영한다', () => {
    const result = CreateDesignRequest.safeParse({
      ...validPayload,
      images: ['https://.../a.jpg', 'https://.../b.jpg'],
      tags: ['프렌치', '글리터'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.images).toEqual(['https://.../a.jpg', 'https://.../b.jpg']);
    expect(result.data?.tags).toEqual(['프렌치', '글리터']);
  });

  it('title이 없으면 거부한다', () => {
    const { title: _title, ...rest } = validPayload;
    expect(CreateDesignRequest.safeParse(rest).success).toBe(false);
  });

  it('title이 100자를 넘으면 거부한다', () => {
    expect(CreateDesignRequest.safeParse({ ...validPayload, title: 'a'.repeat(101) }).success).toBe(
      false,
    );
  });

  it('durationMinutes가 0 이하면 거부한다', () => {
    expect(CreateDesignRequest.safeParse({ ...validPayload, durationMinutes: 0 }).success).toBe(
      false,
    );
  });

  it('durationMinutes가 정수가 아니면 거부한다', () => {
    expect(CreateDesignRequest.safeParse({ ...validPayload, durationMinutes: 1.5 }).success).toBe(
      false,
    );
  });

  it('description이 빈 문자열이면 거부한다', () => {
    expect(CreateDesignRequest.safeParse({ ...validPayload, description: '' }).success).toBe(false);
  });

  it('description이 2000자를 넘으면 거부한다', () => {
    expect(
      CreateDesignRequest.safeParse({ ...validPayload, description: 'a'.repeat(2001) }).success,
    ).toBe(false);
  });

  it('images가 10개를 넘으면 거부한다', () => {
    const images = Array.from({ length: 11 }, (_, i) => `https://.../${i}.jpg`);
    expect(CreateDesignRequest.safeParse({ ...validPayload, images }).success).toBe(false);
  });

  it('images가 10개면 통과한다', () => {
    const images = Array.from({ length: 10 }, (_, i) => `https://.../${i}.jpg`);
    expect(CreateDesignRequest.safeParse({ ...validPayload, images }).success).toBe(true);
  });

  it('tags가 20개를 넘으면 거부한다', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `태그${i}`);
    expect(CreateDesignRequest.safeParse({ ...validPayload, tags }).success).toBe(false);
  });

  it('tags가 20개면 통과한다', () => {
    const tags = Array.from({ length: 20 }, (_, i) => `태그${i}`);
    expect(CreateDesignRequest.safeParse({ ...validPayload, tags }).success).toBe(true);
  });
});
