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

  it('소셜 로그인 시작은 v1 경로, 콜백은 v1 없는 경로에 등록한다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('KAKAO_CLIENT_ID', 'test-client-id');
    vi.stubEnv('KAKAO_REDIRECT_URI', 'https://api.example.com/api/auth/kakao/callback');

    const [startResponse, callbackResponse, oldCallbackResponse] = await Promise.all([
      request(app).get('/api/v1/auth/kakao'),
      request(app).get('/api/auth/kakao/callback'),
      request(app).get('/api/v1/auth/kakao/callback'),
    ]);

    expect(startResponse.status).toBe(302);
    expect(startResponse.headers['set-cookie']?.[0]).toContain('Path=/');
    expect(callbackResponse.status).toBe(400);
    expect(callbackResponse.body.error.code).toBe('INVALID_OAUTH_STATE');
    expect(warn).toHaveBeenCalledWith(
      '[OAuth] state validation failed',
      expect.objectContaining({
        provider: 'kakao',
        hasCode: false,
        hasQueryState: false,
        hasStateCookie: false,
        stateMatched: false,
      }),
    );
    expect(oldCallbackResponse.status).toBe(404);
    expect(oldCallbackResponse.body.error.code).toBe('ROUTE_NOT_FOUND');

    const swaggerResponse = await request(app).get('/api-docs/user.json');
    expect(swaggerResponse.body.paths).toHaveProperty('/api/v1/auth/{provider}');
    expect(swaggerResponse.body.paths).toHaveProperty('/api/auth/{provider}/callback');

    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('사용자 Swagger에 소셜 토큰 전달과 상세 조회 응답 필드를 노출한다', async () => {
    const response = await request(app).get('/api-docs/user.json');
    const spec = response.body;

    const callbackLocation =
      spec.paths['/api/auth/{provider}/callback'].get.responses['302'].headers.Location;
    expect(callbackLocation.schema.example).toContain('accessToken=');
    expect(callbackLocation.schema.example).toContain('refreshToken=');

    const estimateShopProperties =
      spec.paths['/api/v1/estimate/{proposal_id}/detail'].get.responses['200'].content[
        'application/json'
      ].schema.properties.success.properties.shop.properties;
    expect(estimateShopProperties).toHaveProperty('rating');
    expect(estimateShopProperties).toHaveProperty('reviewCount');

    const reservationSchema = spec.components.schemas.ReservationDetailResponse;
    expect(reservationSchema.properties).toMatchObject({
      shopRating: expect.any(Object),
      shopReviewCount: expect.any(Object),
      totalPrice: expect.any(Object),
      status: expect.any(Object),
    });
    expect(
      spec.paths['/api/v1/reserve/{reservationId}'].get.responses['200'].content['application/json']
        .schema.$ref,
    ).toBe('#/components/schemas/ReservationDetailSuccessResponse');
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
