import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { UnauthorizedSmsWebhookError } from '../errors/estimate-response.error';

// SMS 중계 클라이언트(문자 수신 앱) 전용 인증 - shop-sync/design-admin 도메인과 동일하게
// 헤더 키 대조 방식을 따른다. 이 웹훅은 사용자 JWT가 아니라 우리가 발급한 공유 키로 호출된다.
export const smsWebhookAuth: RequestHandler = (req, _res, next) => {
  const configuredKey = process.env.SMS_WEBHOOK_KEY;
  const receivedKey = req.header('x-sms-webhook-key');

  if (!configuredKey || !receivedKey) {
    next(new UnauthorizedSmsWebhookError());
    return;
  }

  const configuredBuffer = Buffer.from(configuredKey);
  const receivedBuffer = Buffer.from(receivedKey);
  const authorized =
    configuredBuffer.length === receivedBuffer.length &&
    timingSafeEqual(configuredBuffer, receivedBuffer);

  if (!authorized) {
    next(new UnauthorizedSmsWebhookError());
    return;
  }

  next();
};
