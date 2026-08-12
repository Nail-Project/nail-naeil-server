import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';

type SwaggerDocument = Record<string, unknown> & {
  info: Record<string, unknown>;
  paths?: Record<string, unknown>;
};

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '네일내일 API',
      version: '1.0.0',
      description: '네일내일 서버 API 명세입니다.',
    },
    servers: [
      {
        url: '/',
        description: '현재 접속한 서버',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ShopSummary: {
          type: 'object',
          required: [
            'shopId',
            'name',
            'address',
            'latitude',
            'longitude',
            'rating',
            'reviewCount',
            'isWished',
          ],
          properties: {
            shopId: { type: 'integer', example: 1 },
            name: { type: 'string', example: '네일내일' },
            address: { type: 'string' },
            addressDetail: { type: 'string', nullable: true },
            districtName: { type: 'string', nullable: true },
            adminDongName: { type: 'string', nullable: true },
            latitude: { type: 'number', format: 'double' },
            longitude: { type: 'number', format: 'double' },
            thumbnailImageUrl: { type: 'string', format: 'uri', nullable: true },
            businessHours: {
              nullable: true,
              description: '요일별 영업시간 JSON. 데이터가 없으면 null',
            },
            closedDays: {
              nullable: true,
              description: '휴무일 JSON. 데이터가 없으면 null',
            },
            rating: { type: 'number', format: 'double', example: 4.8 },
            reviewCount: { type: 'integer', example: 24 },
            distanceMeters: {
              type: 'integer',
              nullable: true,
              description: '사용자 위도·경도를 함께 전달한 경우만 계산',
            },
            isWished: { type: 'boolean', example: true },
          },
        },
        ShopListSuccess: {
          type: 'object',
          properties: {
            shops: { type: 'array', items: { $ref: '#/components/schemas/ShopSummary' } },
            nextCursor: { type: 'integer', nullable: true },
          },
        },
        ShopWishResponse: {
          type: 'object',
          required: ['shopId', 'isWished'],
          properties: {
            shopId: { type: 'integer', example: 1 },
            isWished: { type: 'boolean', example: true },
          },
        },
        ShopReviewListResponse: {
          type: 'object',
          required: ['reviews', 'nextCursor'],
          properties: {
            reviews: {
              type: 'array',
              items: {
                type: 'object',
                required: ['reviewId', 'rating', 'createdAt'],
                properties: {
                  reviewId: { type: 'integer', example: 1 },
                  nickname: { type: 'string', nullable: true },
                  profileImageUrl: { type: 'string', format: 'uri', nullable: true },
                  rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
                  content: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            nextCursor: { type: 'integer', nullable: true },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          required: ['resultType', 'error', 'success'],
          properties: {
            resultType: {
              type: 'string',
              enum: ['FAIL'],
              example: 'FAIL',
            },
            error: {
              type: 'object',
              required: ['code', 'message', 'data'],
              properties: {
                code: {
                  type: 'string',
                  description: '클라이언트가 오류 원인을 구분할 때 사용하는 서버 에러 코드',
                },
                message: {
                  type: 'string',
                  description: '사용자에게 전달 가능한 오류 메시지',
                },
                data: {
                  nullable: true,
                  description: '검증 오류 등 에러별 추가 정보',
                },
              },
            },
            success: {
              nullable: true,
              example: null,
            },
          },
        },
      },
      responses: {
        InvalidShopQueryResponse: {
          description: '잘못된 샵 조회 요청',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              example: {
                resultType: 'FAIL',
                error: {
                  code: 'INVALID_SHOP_QUERY_REQUEST',
                  message: '샵 조회 요청을 확인해주세요.',
                  data: null,
                },
                success: null,
              },
            },
          },
        },
        ShopNotFoundResponse: {
          description: '샵을 찾을 수 없음',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              example: {
                resultType: 'FAIL',
                error: {
                  code: 'SHOP_NOT_FOUND',
                  message: '샵을 찾을 수 없습니다.',
                  data: { shopId: 1 },
                },
                success: null,
              },
            },
          },
        },
        AuthenticationRequiredResponse: {
          description: '인증 실패',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              examples: {
                unauthorized: {
                  value: {
                    resultType: 'FAIL',
                    error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.', data: null },
                    success: null,
                  },
                },
                tokenExpired: {
                  value: {
                    resultType: 'FAIL',
                    error: { code: 'TOKEN_EXPIRED', message: '토큰이 만료됐습니다.', data: null },
                    success: null,
                  },
                },
                tokenInvalid: {
                  value: {
                    resultType: 'FAIL',
                    error: {
                      code: 'TOKEN_INVALID',
                      message: '유효하지 않은 토큰입니다.',
                      data: null,
                    },
                    success: null,
                  },
                },
              },
            },
          },
        },
        InternalServerErrorResponse: {
          description: '서버 내부 오류',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              example: {
                resultType: 'FAIL',
                error: {
                  code: 'INTERNAL_SERVER_ERROR',
                  message: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
                  data: null,
                },
                success: null,
              },
            },
          },
        },
      },
    },
  },
  // Windows에서 path.resolve()가 역슬래시를 반환해 glob이 동작하지 않으므로 슬래시로 변환한다.
  apis: [path.resolve(__dirname, '../**/*.{ts,js}').replace(/\\/g, '/')],
}) as SwaggerDocument;

const paths = swaggerSpec.paths ?? {};

const createSwaggerSpec = (title: string, pathPrefix: string) => ({
  ...swaggerSpec,
  info: {
    ...swaggerSpec.info,
    title,
  },
  paths: Object.fromEntries(
    Object.entries(paths).filter(([path]) => path === '/health' || path.startsWith(pathPrefix)),
  ),
});

export const userSwaggerSpec = createSwaggerSpec('네일내일 사용자 API', '/api');

export const adminSwaggerSpec = createSwaggerSpec('네일내일 관리자 API', '/admin/api');
