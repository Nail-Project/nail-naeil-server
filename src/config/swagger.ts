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
