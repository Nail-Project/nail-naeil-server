import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { smsWebhookAuth } from '../../src/estimate-response/middlewares/sms-webhook-auth.middleware';

const mockReq = (headerValue?: string): Request =>
  ({
    header: (name: string) =>
      name.toLowerCase() === 'x-sms-webhook-key' ? headerValue : undefined,
  }) as unknown as Request;

const res = {} as Response;

describe('smsWebhookAuth 미들웨어', () => {
  const originalKey = process.env.SMS_WEBHOOK_KEY;

  beforeEach(() => {
    process.env.SMS_WEBHOOK_KEY = 'test-webhook-key';
  });

  afterEach(() => {
    // originalKey가 undefined일 때 그대로 대입하면 삭제가 아니라 문자열 "undefined"가
    // 들어가버리므로(process.env는 값을 문자열로 강제 변환), 명시적으로 delete한다.
    if (originalKey === undefined) {
      delete process.env.SMS_WEBHOOK_KEY;
    } else {
      process.env.SMS_WEBHOOK_KEY = originalKey;
    }
  });

  it('올바른 키면 에러 없이 next를 호출한다', () => {
    const next = vi.fn();

    smsWebhookAuth(mockReq('test-webhook-key'), res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('헤더가 없으면 UNAUTHORIZED_SMS_WEBHOOK(401)로 next를 호출한다', () => {
    const next = vi.fn();

    smsWebhookAuth(mockReq(undefined), res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED_SMS_WEBHOOK', statusCode: 401 }),
    );
  });

  it('키가 틀리면 UNAUTHORIZED_SMS_WEBHOOK(401)로 next를 호출한다', () => {
    const next = vi.fn();

    smsWebhookAuth(mockReq('wrong-key'), res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED_SMS_WEBHOOK', statusCode: 401 }),
    );
  });

  it('서버에 키가 설정돼 있지 않으면 401로 next를 호출한다', () => {
    delete process.env.SMS_WEBHOOK_KEY;
    const next = vi.fn();

    smsWebhookAuth(mockReq('test-webhook-key'), res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'UNAUTHORIZED_SMS_WEBHOOK', statusCode: 401 }),
    );
  });
});
