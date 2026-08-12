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
    expect(res.body.servers).toEqual([{ url: '/', description: '현재 접속한 서버' }]);
    expect(Object.keys(res.body.paths)).toContain('/health');
    expect(Object.keys(res.body.paths).some((path) => path.startsWith(pathPrefix))).toBe(true);
  });

  it('Swagger UI에서 사용자/관리자 API 선택 목록을 노출한다', async () => {
    const [htmlResponse, initializerResponse] = await Promise.all([
      request(app).get('/api-docs/'),
      request(app).get('/api-docs/swagger-ui-init.js'),
    ]);

    expect(htmlResponse.status).toBe(200);
    expect(htmlResponse.text).not.toContain(
      '.swagger-ui .topbar .download-url-wrapper { display: none }',
    );
    expect(initializerResponse.status).toBe(200);
    expect(initializerResponse.text).toContain('사용자 API');
    expect(initializerResponse.text).toContain('/api-docs/user.json');
    expect(initializerResponse.text).toContain('관리자 API');
    expect(initializerResponse.text).toContain('/api-docs/admin.json');
  });

  it('관리자 Swagger에 샵 관리 API를 포함한다', async () => {
    const res = await request(app).get('/api-docs/admin.json');

    expect(res.body.paths).toHaveProperty('/admin/api/v1/shops');
    expect(res.body.paths).toHaveProperty('/admin/api/v1/shops/{shopId}');
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
