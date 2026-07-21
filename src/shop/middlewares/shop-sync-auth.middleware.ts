import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { UnauthorizedShopSyncError } from '../errors/shop.error';

export const shopSyncAuth: RequestHandler = (req, _res, next) => {
  const configuredKey = process.env.SHOP_SYNC_ADMIN_KEY;
  const receivedKey = req.header('x-admin-sync-key');

  if (!configuredKey || !receivedKey) {
    next(new UnauthorizedShopSyncError());
    return;
  }

  const configuredBuffer = Buffer.from(configuredKey);
  const receivedBuffer = Buffer.from(receivedKey);
  const authorized =
    configuredBuffer.length === receivedBuffer.length &&
    timingSafeEqual(configuredBuffer, receivedBuffer);

  if (!authorized) {
    next(new UnauthorizedShopSyncError());
    return;
  }

  next();
};
