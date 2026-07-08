import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';

describe('app', () => {
  it('존재하지 않는 경로는 기본 404 HTML이 아니라 공통 에러 포맷으로 응답한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(app).get('/no-such-route');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      resultType: 'FAIL',
      error: {
        code: 'ROUTE_NOT_FOUND',
      },
      success: null,
    });

    vi.restoreAllMocks();
  });
});
