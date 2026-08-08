import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createReviewRouter } from '../../src/review/review.route';
import type { ReviewService } from '../../src/review/service/review.service';
import {
  ReviewAlreadyExistsError,
  ReviewNotEligibleError,
  ReviewNotFoundError,
} from '../../src/review/error/review.error';
import { ReviewFailedError } from '../../src/common/errors/common.error';

// 라우트 테스트에서는 JWT 검증 없이 userId만 주입되면 충분하므로 미들웨어를 mock으로 대체한다.
vi.mock('../../src/common/middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    req.role = 'CUSTOMER';
    next();
  },
}));

const TEMP_USER_ID = 1;

const createApp = () => {
  const service = {
    createReview: vi.fn().mockResolvedValue({
      reviewId: 100,
      shopId: 5,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
      createdAt: new Date('2026-08-08T10:00:00.000Z'),
    }),
    updateReview: vi.fn().mockResolvedValue({
      reviewId: 100,
      shopId: 5,
      rating: 4,
      content: '다시 생각해보니 조금 아쉬운 점도 있었어요.',
      updatedAt: new Date('2026-08-09T10:00:00.000Z'),
    }),
    deleteReview: vi.fn().mockResolvedValue({ reviewId: 100 }),
  };
  const app = express();

  app.use(express.json());
  app.use('/api/v1/reviews', createReviewRouter(service as unknown as ReviewService));
  app.use(errorHandler);

  return { app, service };
};

describe('POST /api/v1/reviews', () => {
  it('정상 요청은 201로 응답하고 서비스에 파싱된 값과 인증된 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ shopId: 5, rating: 5, content: '시술이 꼼꼼하고 만족스러웠어요!' });

    expect(response.status).toBe(201);
    expect(response.body.success).toEqual({
      reviewId: 100,
      shopId: 5,
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
      createdAt: '2026-08-08T10:00:00.000Z',
    });
    expect(service.createReview).toHaveBeenCalledWith(5, TEMP_USER_ID, {
      rating: 5,
      content: '시술이 꼼꼼하고 만족스러웠어요!',
    });
  });

  it('내용 없이 별점만 보내도 201로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/reviews').send({ shopId: 5, rating: 5 });

    expect(response.status).toBe(201);
    expect(service.createReview).toHaveBeenCalledWith(5, TEMP_USER_ID, { rating: 5 });
  });

  it('shopId가 없거나 숫자가 아니면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ rating: 5, content: '좋아요' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REVIEW_VALIDATION_FAILED');
    expect(service.createReview).not.toHaveBeenCalled();
  });

  it('별점이 범위를 벗어나면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ shopId: 5, rating: 6, content: '좋아요' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REVIEW_VALIDATION_FAILED');
    expect(service.createReview).not.toHaveBeenCalled();
  });

  it('내용이 빈 문자열이면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ shopId: 5, rating: 5, content: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REVIEW_VALIDATION_FAILED');
    expect(service.createReview).not.toHaveBeenCalled();
  });

  it('서비스가 404를 던지면 그대로 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.createReview.mockRejectedValueOnce(new ReviewNotEligibleError());

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ shopId: 999, rating: 5, content: '좋아요' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('REVIEW_NOT_ELIGIBLE');
  });

  it('서비스가 이미 작성된 리뷰라고 하면 409로 응답한다', async () => {
    const { app, service } = createApp();
    service.createReview.mockRejectedValueOnce(new ReviewAlreadyExistsError());

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ shopId: 5, rating: 5, content: '좋아요' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
  });

  it('서비스가 저장 실패를 던지면 500으로 응답하고 원본 에러를 노출하지 않는다', async () => {
    const { app, service } = createApp();
    service.createReview.mockRejectedValueOnce(
      new ReviewFailedError({ originalError: new Error('prisma failure') }),
    );

    const response = await request(app)
      .post('/api/v1/reviews')
      .send({ shopId: 5, rating: 5, content: '좋아요' });

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('REVIEW_FAILED');
    expect(response.body.error.data).toBeNull();
    expect(JSON.stringify(response.body)).not.toContain('prisma failure');
  });
});

describe('PATCH /api/v1/reviews/:reviewId', () => {
  it('정상 요청은 200으로 응답하고 서비스에 파싱된 값을 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/api/v1/reviews/100').send({ rating: 4 });

    expect(response.status).toBe(200);
    expect(response.body.success).toEqual({
      reviewId: 100,
      shopId: 5,
      rating: 4,
      content: '다시 생각해보니 조금 아쉬운 점도 있었어요.',
      updatedAt: '2026-08-09T10:00:00.000Z',
    });
    expect(service.updateReview).toHaveBeenCalledWith(100, TEMP_USER_ID, { rating: 4 });
  });

  it('숫자가 아닌 reviewId는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/api/v1/reviews/not-a-number').send({ rating: 4 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REVIEW_REQUEST');
    expect(service.updateReview).not.toHaveBeenCalled();
  });

  it('수정할 필드가 하나도 없으면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/api/v1/reviews/100').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('REVIEW_VALIDATION_FAILED');
    expect(service.updateReview).not.toHaveBeenCalled();
  });

  it('서비스가 404를 던지면 그대로 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.updateReview.mockRejectedValueOnce(new ReviewNotFoundError());

    const response = await request(app).patch('/api/v1/reviews/999').send({ rating: 4 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('REVIEW_NOT_FOUND');
  });
});

describe('DELETE /api/v1/reviews/:reviewId', () => {
  it('정상 요청은 200으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/api/v1/reviews/100');

    expect(response.status).toBe(200);
    expect(response.body.success).toEqual({ reviewId: 100 });
    expect(service.deleteReview).toHaveBeenCalledWith(100, TEMP_USER_ID);
  });

  it('숫자가 아닌 reviewId는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/api/v1/reviews/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REVIEW_REQUEST');
    expect(service.deleteReview).not.toHaveBeenCalled();
  });

  it('서비스가 404를 던지면 그대로 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.deleteReview.mockRejectedValueOnce(new ReviewNotFoundError());

    const response = await request(app).delete('/api/v1/reviews/999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('REVIEW_NOT_FOUND');
  });
});
