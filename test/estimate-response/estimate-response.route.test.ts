import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createEstimateResponseRouter } from '../../src/estimate-response/estimate-response.route';
import type { EstimateResponseService } from '../../src/estimate-response/service/estimate-response.service';

const createApp = () => {
  const service = {
    createSmsMessage: vi.fn().mockResolvedValue({
      id: 10,
      source: 'android-device-a1b2c3',
      messageId: 'android-sms-1042',
      direction: 'INBOUND',
      status: 'PENDING',
    }),
    getList: vi.fn().mockResolvedValue({ requestId: 1, responses: [] }),
    getDetail: vi.fn().mockResolvedValue({ id: 10 }),
    getProposalTimes: vi.fn().mockResolvedValue({ estimateResponseId: 10, proposalTimes: [] }),
  };
  const app = express();

  app.use(express.json());
  app.use(
    '/api/v1/estimate',
    createEstimateResponseRouter(service as unknown as EstimateResponseService),
  );
  app.use(errorHandler);

  return { app, service };
};

describe('estimate response routes', () => {
  it('견적 결과 목록 API에 request_id를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/estimate/result/1');

    expect(response.status).toBe(200);
    expect(service.getList).toHaveBeenCalledWith(1);
  });

  it('샵 견적 상세 API에 proposal_id를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/estimate/10/detail');

    expect(response.status).toBe(200);
    expect(service.getDetail).toHaveBeenCalledWith(10);
  });

  it('예약 가능 시간 API에 proposal_id를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/estimate/10/time');

    expect(response.status).toBe(200);
    expect(service.getProposalTimes).toHaveBeenCalledWith(10);
  });

  it('잘못된 proposal_id는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/estimate/not-a-number/detail');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ESTIMATE_RESPONSE');
    expect(service.getDetail).not.toHaveBeenCalled();
  });

  it('샵 견적 응답 문자 접수 API는 원본 저장 후 202로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/api/v1/estimate')
      .send({
        source: 'android-device-a1b2c3',
        messageId: 'android-sms-1042',
        rawPayload: {
          address: '01012345678',
          body: '견적 문자',
          receivedAt: '2026-07-18T13:20:38+09:00',
        },
      });

    expect(response.status).toBe(202);
    expect(service.createSmsMessage).toHaveBeenCalledOnce();
  });
});
