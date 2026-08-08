import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createReviewRouter } from '../../src/review/review.route';
import type { ReviewService } from '../../src/review/service/review.service';
import {
  ReviewNotAllowedError,
  ReviewAlreadyExistsError,
  ReviewReservationNotFoundError,
} from '../../src/review/error/review.error';

// 라우트 테스트에서는 JWT 검증 없이 userId만 주입되면 충분하므로 미들웨어를 mock으로 대체한다.
vi.mock('../../src/common/middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    req.role = 'USER';
    next();
  },
}));

const TEMP_USER_ID = 1;

const createApp = () => {
  const service = {
    createReview: vi.fn().mockResolvedValue({
      reviewId: 100,
      reservationId: 1,
      shopId: 5,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
      createdAt: new Date('2026-08-08T10:00:00.000Z'),
    }),
  };
  const app = express();

  app.use(express.json());
  app.use('/api/v1/reserve', createReviewRouter(service as unknown as ReviewService));
  app.use(errorHandler);

  return { app, service };
};

describe('POST /api/v1/reserve/:reservationId/review', () => {
  it('정상 요청은 201로 응답하고 서비스에 파싱된 값과 인증된 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reserve/1/review')
      .send({ rating: 5, content: '시술이 꼼꼼하고 만족스러웠어요!' });

    expect(response.status).toBe(201);
    expect(response.body.success).toEqual({
      reviewId: 100,
      reservationId: 1,
      shopId: 5,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
      createdAt: '2026-08-08T10:00:00.000Z',
    });
    expect(service.createReview).toHaveBeenCalledWith(1n, TEMP_USER_ID, {
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
    });
  });

  it('숫자가 아닌 예약 id는 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reserve/not-a-number/review')
      .send({ rating: 5, content: '좋아요' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REVIEW_RESERVATION_ID');
    expect(service.createReview).not.toHaveBeenCalled();
  });

  it('별점이 범위를 벗어나면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reserve/1/review')
      .send({ rating: 6, content: '좋아요' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REVIEW_VALIDATION_FAILED');
    expect(service.createReview).not.toHaveBeenCalled();
  });

  it('내용이 비어있으면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reserve/1/review')
      .send({ rating: 5, content: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REVIEW_VALIDATION_FAILED');
    expect(service.createReview).not.toHaveBeenCalled();
  });

  it('서비스가 404를 던지면 그대로 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.createReview.mockRejectedValueOnce(new ReviewReservationNotFoundError());

    const response = await request(app)
      .post('/api/v1/reserve/999/review')
      .send({ rating: 5, content: '좋아요' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('REVIEW_RESERVATION_NOT_FOUND');
  });

  it('서비스가 완료되지 않은 예약이라고 하면 409로 응답한다', async () => {
    const { app, service } = createApp();
    service.createReview.mockRejectedValueOnce(new ReviewNotAllowedError());

    const response = await request(app)
      .post('/api/v1/reserve/1/review')
      .send({ rating: 5, content: '좋아요' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REVIEW_NOT_ALLOWED');
  });

  it('서비스가 이미 작성된 리뷰라고 하면 409로 응답한다', async () => {
    const { app, service } = createApp();
    service.createReview.mockRejectedValueOnce(new ReviewAlreadyExistsError());

    const response = await request(app)
      .post('/api/v1/reserve/1/review')
      .send({ rating: 5, content: '좋아요' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
  });
});
