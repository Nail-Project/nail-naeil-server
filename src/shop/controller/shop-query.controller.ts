import type { NextFunction, Request, Response } from 'express';
import { success } from '../../common/responses/api-response';
import { GetShopDetailRequestSchema } from '../dto/request/get-shop-detail-request';
import { GetShopListRequestSchema } from '../dto/request/get-shop-list-request';
import { SearchShopRequestSchema } from '../dto/request/search-shop-request';
import { InvalidShopQueryRequestError } from '../errors/shop.error';
import type { ShopQueryService } from '../service/shop-query.service';

export class ShopQueryController {
  constructor(private readonly service: ShopQueryService) {}

  getList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetShopListRequestSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new InvalidShopQueryRequestError(parsed.error.flatten());
      }

      res.status(200).json(success(await this.service.getList(parsed.data)));
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = SearchShopRequestSchema.safeParse(req.query);
      if (!parsed.success) {
        throw new InvalidShopQueryRequestError(parsed.error.flatten());
      }

      res.status(200).json(success(await this.service.search(parsed.data)));
    } catch (error) {
      next(error);
    }
  };

  getDetail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = GetShopDetailRequestSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new InvalidShopQueryRequestError(parsed.error.flatten());
      }

      res.status(200).json(success(await this.service.getDetail(parsed.data.shopId)));
    } catch (error) {
      next(error);
    }
  };
}
