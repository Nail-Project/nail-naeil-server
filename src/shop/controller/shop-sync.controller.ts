import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import { syncShopRequestSchema } from '../dto/request/sync-shop-request';
import { InvalidShopSyncRequestError } from '../errors/shop.error';
import type { ShopSyncService } from '../service/shop-sync.service';

export class ShopSyncController {
  constructor(private readonly service: ShopSyncService) {}

  sync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = syncShopRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new InvalidShopSyncRequestError({
          issues: parsed.error.issues.map(({ path, message }) => ({ path, message })),
        });
      }

      res.status(200).json(success(await this.service.sync(parsed.data)));
    } catch (error) {
      next(error);
    }
  };
}
