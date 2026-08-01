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
        url: 'http://localhost:3000',
        description: 'Local server',
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
    },
  },
  apis: ['src/**/*.ts'],
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
