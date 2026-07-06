import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from './error-handler.middleware';
import { RequiredFieldMissingError } from '../errors/common.error';
import { success } from '../responses/api-response';

const createTestApp = () => {
  const app = express();

  app.get('/ok', (_req, res) => {
    res.json(success({ message: 'ok' }));
  });

  app.get('/known-error', () => {
    throw new RequiredFieldMissingError({ field: 'name' });
  });

  app.get('/unknown-error', () => {
    throw new Error('예상하지 못한 오류');
  });

  app.use(errorHandler);

  return app;
};

describe('errorHandler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('정상 응답은 SUCCESS 포맷으로 반환된다', async () => {
    const res = await request(createTestApp()).get('/ok');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      resultType: 'SUCCESS',
      error: null,
      success: { message: 'ok' },
    });
  });

  it('AppError는 정의된 상태 코드와 에러 코드로 응답한다', async () => {
    const res = await request(createTestApp()).get('/known-error');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      resultType: 'FAIL',
      error: {
        code: 'REQUIRED_FIELD_MISSING',
        message: '필수 정보를 입력해주세요.',
        data: { field: 'name' },
      },
      success: null,
    });
  });

  it('예상하지 못한 예외는 500과 공통 에러 코드로 응답하고 콘솔에 로그를 남긴다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(createTestApp()).get('/unknown-error');

    expect(res.status).toBe(500);
    expect(res.body.resultType).toBe('FAIL');
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(res.body.success).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });
});
