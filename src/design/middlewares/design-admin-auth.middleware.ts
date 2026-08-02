import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { UnauthorizedDesignAdminError } from '../error/design.error';

// 관리자 CRUD 전용 인증 - 아직 관리자 role/유저 시스템이 없어서
// shop-sync 도메인(shopSyncAuth)과 동일하게 헤더 키 대조 방식을 그대로 따른다.
export const designAdminAuth: RequestHandler = (req, _res, next) => {
  const configuredKey = process.env.DESIGN_ADMIN_KEY;
  const receivedKey = req.header('x-admin-design-key');

  if (!configuredKey || !receivedKey) {
    next(new UnauthorizedDesignAdminError());
    return;
  }

  const configuredBuffer = Buffer.from(configuredKey);
  const receivedBuffer = Buffer.from(receivedKey);
  const authorized =
    configuredBuffer.length === receivedBuffer.length &&
    timingSafeEqual(configuredBuffer, receivedBuffer);

  if (!authorized) {
    next(new UnauthorizedDesignAdminError());
    return;
  }

  next();
};
