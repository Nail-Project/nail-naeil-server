import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createReservationRouter } from '../../src/reservation/reservation.route';
import type { ReservationService } from '../../src/reservation/service/reservation.service';
import { encodeCursor } from '../../src/common/pagination/cursor';
import {
  ReservationAlreadyFinalizedError,
  ReservationNotFoundError,
} from '../../src/reservation/error/reservation.error';

// 라우트 테스트에서는 JWT 검증 없이 userId만 주입되면 충분하므로 미들웨어를 mock으로 대체한다.
vi.mock('../../src/common/middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    req.role = 'USER';
    next();
  },
}));

const TEMP_USER_ID = 1n;

const createApp = () => {
  const service = {
    createReservation: vi.fn().mockResolvedValue({
      reservationId: 100,
      shopName: '영찬 네일 강남점',
      reservedAt: new Date('2026-08-01T10:00:00.000Z'),
      totalPrice: 55_000,
      status: 'CONFIRMED',
    }),
    getReservations: vi.fn().mockResolvedValue({
      reservations: [],
      pageInfo: { nextCursor: null, hasNext: false },
    }),
    getReservationDetail: vi.fn().mockResolvedValue({
      reservationId: 1,
      shopName: '영찬 네일 강남점',
      address: '서울시 강남구',
      reservedAt: new Date('2026-08-01T10:00:00.000Z'),
      totalPrice: 55_000,
      status: 'CONFIRMED',
      designName: null,
    }),
    cancelReservation: vi.fn().mockResolvedValue(undefined),
  };
  const app = express();

  app.use(express.json());
  app.use('/api/v1/reserve', createReservationRouter(service as unknown as ReservationService));
  app.use(errorHandler);

  return { app, service };
};

describe('POST /api/v1/reserve', () => {
  it('정상 요청은 201로 응답하고 서비스에 파싱된 값과 임시 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/reserve').send({ proposalId: 5, timeId: 12 });

    expect(response.status).toBe(201);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.createReservation).toHaveBeenCalledWith(
      { proposalId: 5, timeId: 12 },
      TEMP_USER_ID,
    );
  });

  it('proposalId가 없으면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/reserve').send({ timeId: 12 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('RESERVATION_VALIDATION_FAILED');
    expect(service.createReservation).not.toHaveBeenCalled();
  });

  it('음수 timeId는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/reserve').send({ proposalId: 5, timeId: -1 });

    expect(response.status).toBe(400);
    expect(service.createReservation).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/reserve/detail', () => {
  it('status를 전달하면 200으로 응답하고 서비스에 cursor 없이 기본 size와 함께 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .get('/api/v1/reserve/detail')
      .query({ status: 'CONFIRMED' });

    expect(response.status).toBe(200);
    expect(service.getReservations).toHaveBeenCalledWith('CONFIRMED', TEMP_USER_ID, undefined, 10);
  });

  it('cursor/size를 전달하면 디코딩해서 서비스에 전달한다', async () => {
    const { app, service } = createApp();
    const cursor = encodeCursor({ reservedAt: '2026-05-10T16:00:00.000Z', id: '7' });

    const response = await request(app)
      .get('/api/v1/reserve/detail')
      .query({ status: 'PAST', cursor, size: '20' });

    expect(response.status).toBe(200);
    expect(service.getReservations).toHaveBeenCalledWith(
      'PAST',
      TEMP_USER_ID,
      {
        reservedAt: new Date('2026-05-10T16:00:00.000Z'),
        id: 7n,
      },
      20,
    );
  });

  it('status가 없으면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/reserve/detail');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RESERVATION_REQUEST');
    expect(service.getReservations).not.toHaveBeenCalled();
  });

  it('형식이 깨진 cursor는 400으로 거부한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .get('/api/v1/reserve/detail')
      .query({ status: 'CONFIRMED', cursor: 'not-a-valid-cursor' });

    expect(response.status).toBe(400);
    expect(service.getReservations).not.toHaveBeenCalled();
  });

  it('같은 쿼리 키를 반복해 배열이 되면 400으로 거부한다 (Express 기본 simple 파서 기준)', async () => {
    const { app, service } = createApp();

    const response = await request(app).get(
      '/api/v1/reserve/detail?status=CONFIRMED&size=1&size=2',
    );

    expect(response.status).toBe(400);
    expect(service.getReservations).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/reserve/:reservationId', () => {
  it('정상적인 id는 200으로 응답하고 서비스에 BigInt로 변환해 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/reserve/1');

    expect(response.status).toBe(200);
    expect(service.getReservationDetail).toHaveBeenCalledWith(1n, TEMP_USER_ID);
  });

  it('숫자가 아닌 id는 400으로 응답하고, 쿼리 검증과 구분되는 전용 에러 코드를 반환한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/reserve/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RESERVATION_ID');
    expect(service.getReservationDetail).not.toHaveBeenCalled();
  });

  it('0 이하의 id는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/reserve/0');

    expect(response.status).toBe(400);
    expect(service.getReservationDetail).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/reserve/:reservationId', () => {
  it('정상 요청은 204로 응답하고(본문 없음) 서비스에 id/userId/사유를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .delete('/api/v1/reserve/1')
      .send({ reason: '개인 사정으로 인해 취소할게요' });

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(service.cancelReservation).toHaveBeenCalledWith(
      1n,
      TEMP_USER_ID,
      '개인 사정으로 인해 취소할게요',
    );
  });

  it('숫자가 아닌 id는 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .delete('/api/v1/reserve/not-a-number')
      .send({ reason: '기타' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_RESERVATION_ID');
    expect(service.cancelReservation).not.toHaveBeenCalled();
  });

  it('reason이 없으면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/api/v1/reserve/1').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('RESERVATION_CANCEL_VALIDATION_FAILED');
    expect(service.cancelReservation).not.toHaveBeenCalled();
  });

  it('reason이 빈 문자열이면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/api/v1/reserve/1').send({ reason: '   ' });

    expect(response.status).toBe(400);
    expect(service.cancelReservation).not.toHaveBeenCalled();
  });

  it('서비스가 404를 던지면 그대로 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.cancelReservation.mockRejectedValueOnce(new ReservationNotFoundError());

    const response = await request(app).delete('/api/v1/reserve/999').send({ reason: '기타' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESERVATION_NOT_FOUND');
  });

  it('서비스가 409를 던지면 그대로 409로 응답한다', async () => {
    const { app, service } = createApp();
    service.cancelReservation.mockRejectedValueOnce(new ReservationAlreadyFinalizedError());

    const response = await request(app).delete('/api/v1/reserve/1').send({ reason: '기타' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('RESERVATION_ALREADY_FINALIZED');
  });
});
