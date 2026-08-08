import { describe, expect, it } from 'vitest';
import { userSwaggerSpec } from '../../src/config/swagger';

type SwaggerOperation = {
  responses?: Record<string, { $ref?: string }>;
};

const operation = (path: string, method: string): SwaggerOperation => {
  const paths = userSwaggerSpec.paths as Record<string, Record<string, SwaggerOperation>>;
  return paths[path]?.[method] ?? {};
};

describe('shop query Swagger error responses', () => {
  it.each([
    ['/api/v1/shops', 'get', ['400', '401', '500']],
    ['/api/v1/shops/search', 'get', ['400', '401', '500']],
    ['/api/v1/shops/wishlist', 'get', ['400', '401', '500']],
    ['/api/v1/shops/{shopId}/wish', 'post', ['400', '401', '404', '500']],
    ['/api/v1/shops/{shopId}/wish', 'delete', ['400', '401', '404', '500']],
    ['/api/v1/shops/{shopId}/reviews', 'get', ['400', '404', '500']],
    ['/api/v1/shops/{shopId}', 'get', ['400', '401', '404', '500']],
  ])('%s %s의 예상 에러 응답을 명세한다', (path, method, statusCodes) => {
    const responses = operation(path, method).responses;

    expect(responses).toBeDefined();
    for (const statusCode of statusCodes) {
      expect(responses).toHaveProperty(statusCode);
    }
  });

  it('샵 공통 에러 응답 컴포넌트를 정의한다', () => {
    const components = (userSwaggerSpec as Record<string, unknown>).components as {
      responses?: Record<string, unknown>;
    };

    expect(components.responses).toMatchObject({
      InvalidShopQueryResponse: expect.any(Object),
      ShopNotFoundResponse: expect.any(Object),
      AuthenticationRequiredResponse: expect.any(Object),
      InternalServerErrorResponse: expect.any(Object),
    });
  });
});
