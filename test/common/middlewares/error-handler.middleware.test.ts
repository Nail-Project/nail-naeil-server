import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../../src/common/middlewares/error-handler.middleware';
import {
  PhotoUploadFailedError,
  RequiredFieldMissingError,
} from '../../../src/common/errors/common.error';
import { success } from '../../../src/common/responses/api-response';

const createTestApp = () => {
  const app = express();

  app.get('/ok', (_req, res) => {
    res.json(success({ message: 'ok' }));
  });

  app.get('/known-error', () => {
    throw new RequiredFieldMissingError({ field: 'name' });
  });

  app.get('/known-server-error', () => {
    throw new PhotoUploadFailedError();
  });

  app.get('/unknown-error', () => {
    throw new Error('예상하지 못한 오류');
  });

  app.get('/parse-error-like', () => {
    const err = new SyntaxError('Unexpected token in JSON');
    (err as SyntaxError & { statusCode: number }).statusCode = 400;
    throw err;
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

  it('AppError(4xx)는 정의된 상태 코드와 에러 코드로 응답하고 로그를 남기지 않는다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

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
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('AppError(5xx)는 정의된 상태 코드로 응답하면서 콘솔에 로그를 남긴다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(createTestApp()).get('/known-server-error');

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('PHOTO_UPLOAD_FAILED');
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
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

  it('AppError가 아니지만 statusCode를 가진 에러(예: express.json 파싱 오류)는 상태 코드를 보존한다', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await request(createTestApp()).get('/parse-error-like');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
