import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { adminSwaggerSpec, userSwaggerSpec } from './config/swagger';
import estimateRouter from './estimate/controllers/estimate.controller';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api-docs/user.json', (_req, res) => {
  res.json(userSwaggerSpec);
});

app.get('/api-docs/admin.json', (_req, res) => {
  res.json(adminSwaggerSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      urls: [
        { name: '사용자 API', url: '/api-docs/user.json' },
        { name: '관리자 API', url: '/api-docs/admin.json' },
      ],
    },
  }),
);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: 서버 상태 확인
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: 서버가 정상적으로 실행 중임
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/v1/estimates', estimateRouter);
