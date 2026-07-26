import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '../src/app';

describe('app', () => {
  it.each([
    ['/api-docs/user.json', '/api'],
    ['/api-docs/admin.json', '/admin/api'],
  ])('%s 문서에 API 경로가 포함된다', async (url, pathPrefix) => {
    const res = await request(app).get(url);

    expect(res.status).toBe(200);
    expect(res.body.paths).toBeDefined();
    expect(Object.keys(res.body.paths)).toContain('/health');
    expect(Object.keys(res.body.paths).some((path) => path.startsWith(pathPrefix))).toBe(true);
  });

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
