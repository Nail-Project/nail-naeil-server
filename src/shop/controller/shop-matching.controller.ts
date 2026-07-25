import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import { MatchShopRequestSchema } from '../dto/request/match-shop-request';
import { InvalidShopMatchRequestError } from '../errors/shop.error';
import type { ShopMatchingService } from '../service/shop-matching.service';

export class ShopMatchingController {
  constructor(private readonly service: ShopMatchingService) {}

  match = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = MatchShopRequestSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new InvalidShopMatchRequestError(parsed.error.flatten());
      }

      res.status(200).json(success(await this.service.match(parsed.data)));
    } catch (error) {
      next(error);
    }
  };
}
